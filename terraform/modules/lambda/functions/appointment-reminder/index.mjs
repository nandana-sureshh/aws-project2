/**
 * appointment-reminder/index.mjs
 *
 * EventBridge Scheduler → Lambda → Secrets Manager → RDS → SNS
 *
 * Business logic:
 *   1. Fetch DATABASE_URL from Secrets Manager (same secret as backend application)
 *   2. Query appointments scheduled between now and +24 hours
 *      with status IN ('SCHEDULED', 'CONFIRMED')
 *   3. For each appointment, check if a SYSTEM reminder notification already
 *      exists in the notifications table (deduplication)
 *   4. If no reminder exists:
 *      a. Insert a SYSTEM notification row (mirrors DatabaseNotificationProvider pattern)
 *      b. Publish reminder email to SNS topic
 *   5. Log counts and return summary
 *
 * Design decisions:
 *   - Pure ESM (.mjs) — Node.js 20 Lambda runtime supports this natively
 *   - Uses `pg` (node-postgres) bundled in the Lambda zip — same driver Prisma uses
 *   - AWS SDK v3 clients — available natively in Node.js 20 Lambda runtime
 *   - No TypeScript — Lambda functions are plain JS to avoid build step requirement
 *   - REMINDER_WINDOW_HOURS configurable via environment variable (default 24)
 *   - All config from environment variables — no hardcoded values
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import pg from 'pg';

const { Client } = pg;

// ---- Configuration (all from environment, none hardcoded) ----
const REGION = process.env.AWS_REGION;
const SECRET_NAME = process.env.SECRET_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const REMINDER_HOURS = parseInt(process.env.REMINDER_WINDOW_HOURS ?? '24', 10);

// ---- AWS SDK clients (region from Lambda env, credentials from execution role) ----
const smClient = new SecretsManagerClient({ region: REGION });
const snsClient = new SNSClient({ region: REGION });

/**
 * Fetch DATABASE_URL from Secrets Manager.
 * Uses the same secret as the backend application — no duplicate secret storage.
 */
async function getDatabaseUrl() {
  console.log(`[secrets] Fetching secret: ${SECRET_NAME}`);
  const response = await smClient.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  if (!response.SecretString) {
    throw new Error(`Secret ${SECRET_NAME} has no SecretString`);
  }
  const parsed = JSON.parse(response.SecretString);
  if (!parsed.DATABASE_URL) {
    throw new Error(`Secret ${SECRET_NAME} is missing DATABASE_URL key`);
  }
  return parsed.DATABASE_URL;
}

/**
 * Query appointments occurring within the next REMINDER_HOURS.
 * Joins through patient→user and doctor→user to get names and patient email.
 * Filters status to only SCHEDULED or CONFIRMED (not CANCELLED/COMPLETED/NO_SHOW).
 * Excludes appointments that already have a SYSTEM notification containing
 * 'appointment_reminder' in the metadata.
 */
async function getUpcomingAppointments(client) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_HOURS * 60 * 60 * 1000);

  const query = `
    SELECT
      a.id           AS appointment_id,
      a."scheduledAt",
      a.reason,
      a.duration,
      a.status,
      pu.id          AS patient_user_id,
      pu."firstName" AS patient_first,
      pu."lastName"  AS patient_last,
      pu.email       AS patient_email,
      du."firstName" AS doctor_first,
      du."lastName"  AS doctor_last,
      d.specialization
    FROM appointments a
    JOIN patients     p  ON p.id = a."patientId"
    JOIN users        pu ON pu.id = p."userId"
    JOIN doctors      d  ON d.id = a."doctorId"
    JOIN users        du ON du.id = d."userId"
    WHERE a."scheduledAt" >= $1
      AND a."scheduledAt" <  $2
      AND a.status IN ('SCHEDULED', 'CONFIRMED')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n."userId" = pu.id
          AND n.type = 'SYSTEM'
          AND n.metadata->>'reminder_for' = a.id
      )
    ORDER BY a."scheduledAt" ASC
  `;

  const result = await client.query(query, [now.toISOString(), windowEnd.toISOString()]);
  console.log(`[db] Found ${result.rows.length} appointments needing reminders`);
  return result.rows;
}

/**
 * Insert a SYSTEM notification into the notifications table.
 * Mirrors the DatabaseNotificationProvider.send() pattern from the backend app.
 * The metadata.reminder_for field stores the appointment ID for deduplication.
 */
async function insertReminderNotification(client, appointment) {
  const scheduledStr = new Date(appointment.scheduledAt).toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const metadata = JSON.stringify({
    reminder_for: appointment.appointment_id,
    scheduled_at: appointment.scheduledAt,
    doctor_name: `Dr. ${appointment.doctor_first} ${appointment.doctor_last}`,
    source: 'appointment-reminder-lambda',
  });

  await client.query(
    `INSERT INTO notifications (id, "userId", type, title, message, "isRead", metadata, "createdAt")
     VALUES (gen_random_uuid(), $1, 'SYSTEM', $2, $3, false, $4::jsonb, NOW())`,
    [
      appointment.patient_user_id,
      'Appointment Reminder',
      `Reminder: You have an appointment with Dr. ${appointment.doctor_first} ${appointment.doctor_last} on ${scheduledStr} (UTC).`,
      metadata,
    ]
  );
}

/**
 * Publish an email reminder to the SNS topic.
 * The SNS topic has an email subscription — AWS delivers the message as an email.
 */
async function publishSNSReminder(appointment) {
  const scheduledStr = new Date(appointment.scheduledAt).toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const subject = `CareSync Appointment Reminder — ${scheduledStr} UTC`;
  const message = [
    `Hello ${appointment.patient_first} ${appointment.patient_last},`,
    '',
    `This is a reminder that you have an upcoming appointment:`,
    '',
    `  Date & Time : ${scheduledStr} UTC`,
    `  Doctor      : Dr. ${appointment.doctor_first} ${appointment.doctor_last} (${appointment.specialization})`,
    `  Reason      : ${appointment.reason}`,
    `  Duration    : ${appointment.duration} minutes`,
    '',
    'Please contact us if you need to reschedule.',
    '',
    'CareSync Team',
  ].join('\n');

  await snsClient.send(new PublishCommand({
    TopicArn: SNS_TOPIC_ARN,
    Subject: subject,
    Message: message,
  }));
}

// ---- Lambda Handler ----

export const handler = async (event) => {
  console.log('[reminder] Appointment reminder Lambda started', { event });

  // Validate required environment variables
  if (!SECRET_NAME || !SNS_TOPIC_ARN) {
    throw new Error('Missing required environment variables: SECRET_NAME, SNS_TOPIC_ARN');
  }

  let dbClient;
  const results = { processed: 0, skipped: 0, errors: 0 };

  try {
    const databaseUrl = await getDatabaseUrl();
    dbClient = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    await dbClient.connect();
    console.log('[db] Connected to RDS');

    const appointments = await getUpcomingAppointments(dbClient);

    if (appointments.length === 0) {
      console.log('[reminder] No upcoming appointments require reminders — nothing to do');
      return { statusCode: 200, body: JSON.stringify({ message: 'No reminders needed', ...results }) };
    }

    for (const appt of appointments) {
      try {
        // 1. Write notification to DB (deduplication record + in-app notification)
        await insertReminderNotification(dbClient, appt);

        // 2. Publish email via SNS
        await publishSNSReminder(appt);

        results.processed++;
        console.log(`[reminder] Sent reminder for appointment ${appt.appointment_id} (patient: ${appt.patient_email})`);
      } catch (err) {
        results.errors++;
        console.error(`[reminder] Error processing appointment ${appt.appointment_id}:`, err.message);
        // Continue processing remaining appointments
      }
    }

  } finally {
    if (dbClient) {
      await dbClient.end();
      console.log('[db] Connection closed');
    }
  }

  console.log('[reminder] Completed', results);
  return { statusCode: 200, body: JSON.stringify(results) };
};
