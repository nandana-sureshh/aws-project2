/**
 * notification-cleanup/index.mjs
 *
 * EventBridge Scheduler → Lambda → Secrets Manager → RDS
 *
 * Business logic:
 *   1. Fetch DATABASE_URL from Secrets Manager
 *   2. Delete notifications older than RETENTION_DAYS (default: 30)
 *   3. Log deleted count and return summary
 *
 * Design decisions:
 *   - RETENTION_DAYS is an environment variable — no hardcoded values
 *   - Matches the Notification table schema: id, userId, type, title, message,
 *     isRead, metadata, createdAt  (no updatedAt — confirmed from Prisma schema)
 *   - Uses DELETE...WHERE createdAt < cutoff — atomic, no cursor pagination needed
 *     for typical notification volumes
 *   - Handles empty cleanup runs gracefully (count = 0)
 *   - Structured logging throughout
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

// ---- Configuration (all from environment, none hardcoded) ----
const REGION         = process.env.AWS_REGION;
const SECRET_NAME    = process.env.SECRET_NAME;
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? '30', 10);

const smClient = new SecretsManagerClient({ region: REGION });

/**
 * Fetch DATABASE_URL from Secrets Manager.
 * Reuses the same secret as backend — no duplicate storage.
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
 * Delete notifications older than RETENTION_DAYS.
 * Returns the number of rows deleted.
 */
async function deleteOldNotifications(client) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  console.log(`[cleanup] Deleting notifications created before ${cutoff.toISOString()} (retention: ${RETENTION_DAYS} days)`);

  // Use RETURNING id to get an accurate count of deleted rows
  const result = await client.query(
    `DELETE FROM notifications WHERE "createdAt" < $1`,
    [cutoff.toISOString()]
  );

  return result.rowCount ?? 0;
}

// ---- Lambda Handler ----

export const handler = async (event) => {
  console.log('[cleanup] Notification cleanup Lambda started', {
    event,
    retentionDays: RETENTION_DAYS,
  });

  if (!SECRET_NAME) {
    throw new Error('Missing required environment variable: SECRET_NAME');
  }

  let dbClient;

  try {
    const databaseUrl = await getDatabaseUrl();
    dbClient = new Client({ 
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    await dbClient.connect();
    console.log('[db] Connected to RDS');

    const deletedCount = await deleteOldNotifications(dbClient);

    if (deletedCount === 0) {
      console.log('[cleanup] No old notifications to delete — nothing to do');
    } else {
      console.log(`[cleanup] Successfully deleted ${deletedCount} notifications older than ${RETENTION_DAYS} days`);
    }

    const result = {
      statusCode:     200,
      deletedCount,
      retentionDays:  RETENTION_DAYS,
      cutoffDate:     new Date(Date.now() - RETENTION_DAYS * 86400 * 1000).toISOString(),
      completedAt:    new Date().toISOString(),
    };

    console.log('[cleanup] Completed', result);
    return result;

  } finally {
    if (dbClient) {
      await dbClient.end();
      console.log('[db] Connection closed');
    }
  }
};
