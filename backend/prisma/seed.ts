import { PrismaClient, Role, Gender, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

/**
 * Idempotent seed — safe to run on every container startup.
 *
 * Strategy: upsert by unique key instead of deleteMany + create.
 * This means:
 *  - Running seed on a fresh DB creates all demo records.
 *  - Running seed on a DB that already has real user registrations
 *    only ensures the admin + demo doctors/patients exist; it does NOT
 *    wipe real data.
 *
 * Admin user is ALWAYS created/verified because login requires it.
 */
async function main() {
  console.log('Seeding database (idempotent)...');

  // ------------------------------------------------------------------
  // 1. Admin user — always ensure this exists
  // ------------------------------------------------------------------
  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@caresync.com' },
    update: {},           // don't overwrite password if admin already exists
    create: {
      email: 'admin@caresync.com',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
  });

  console.log(`✅ Admin user: ${adminUser.email}`);

  // ------------------------------------------------------------------
  // 2. Demo doctor 1
  // ------------------------------------------------------------------
  const doctorPassword = await bcrypt.hash('Doctor@123', SALT_ROUNDS);

  const doctor1User = await prisma.user.upsert({
    where: { email: 'dr.smith@caresync.com' },
    update: {},
    create: {
      email: 'dr.smith@caresync.com',
      password: doctorPassword,
      role: Role.DOCTOR,
      firstName: 'James',
      lastName: 'Smith',
      isActive: true,
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctor1User.id },
    update: {},
    create: {
      userId: doctor1User.id,
      specialization: 'Cardiology',
      licenseNumber: 'LIC-DOC-001',
      phone: '+1-555-0101',
      department: 'Cardiology',
      bio: 'Board-certified cardiologist with 15 years of experience.',
      isAvailable: true,
    },
  });

  // ------------------------------------------------------------------
  // 3. Demo doctor 2
  // ------------------------------------------------------------------
  const doctor2User = await prisma.user.upsert({
    where: { email: 'dr.johnson@caresync.com' },
    update: {},
    create: {
      email: 'dr.johnson@caresync.com',
      password: doctorPassword,
      role: Role.DOCTOR,
      firstName: 'Emily',
      lastName: 'Johnson',
      isActive: true,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctor2User.id },
    update: {},
    create: {
      userId: doctor2User.id,
      specialization: 'General Medicine',
      licenseNumber: 'LIC-DOC-002',
      phone: '+1-555-0102',
      department: 'General Medicine',
      bio: 'General practitioner specializing in preventive care.',
      isAvailable: true,
    },
  });

  // ------------------------------------------------------------------
  // 4. Demo patients
  // ------------------------------------------------------------------
  const patientPassword = await bcrypt.hash('Patient@123', SALT_ROUNDS);

  const patient1User = await prisma.user.upsert({
    where: { email: 'patient1@caresync.com' },
    update: {},
    create: {
      email: 'patient1@caresync.com',
      password: patientPassword,
      role: Role.PATIENT,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    },
  });

  const patient1 = await prisma.patient.upsert({
    where: { userId: patient1User.id },
    update: {},
    create: {
      userId: patient1User.id,
      dateOfBirth: new Date('1985-06-15'),
      gender: Gender.MALE,
      phone: '+1-555-0201',
      address: '123 Main St, Springfield, IL 62701',
      bloodGroup: 'O+',
      emergencyContact: '+1-555-0202',
    },
  });

  const patient2User = await prisma.user.upsert({
    where: { email: 'patient2@caresync.com' },
    update: {},
    create: {
      email: 'patient2@caresync.com',
      password: patientPassword,
      role: Role.PATIENT,
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { userId: patient2User.id },
    update: {},
    create: {
      userId: patient2User.id,
      dateOfBirth: new Date('1990-03-22'),
      gender: Gender.FEMALE,
      phone: '+1-555-0301',
      address: '456 Oak Ave, Springfield, IL 62702',
      bloodGroup: 'A+',
      emergencyContact: '+1-555-0302',
    },
  });

  // ------------------------------------------------------------------
  // 5. Demo appointments (only create if neither patient nor doctor has
  //    any appointments yet, to avoid duplicate seeding)
  // ------------------------------------------------------------------
  const existingAppointmentCount = await prisma.appointment.count({
    where: {
      doctorId: { in: [doctor1.id, doctor2.id] },
    },
  });

  if (existingAppointmentCount === 0) {
    const appointment1 = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        doctorId: doctor1.id,
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: AppointmentStatus.SCHEDULED,
        reason: 'Annual cardiac checkup',
        duration: 45,
      },
    });

    const appointment2 = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        doctorId: doctor2.id,
        scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
        reason: 'General health evaluation',
        duration: 30,
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient2.id,
        doctorId: doctor2.id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: AppointmentStatus.CONFIRMED,
        reason: 'Follow-up consultation',
        duration: 30,
      },
    });

    await prisma.medicalRecord.create({
      data: {
        appointmentId: appointment2.id,
        patientId: patient1.id,
        doctorId: doctor2.id,
        diagnosis: 'Mild hypertension, BMI within normal range',
        notes: 'Patient reports occasional headaches. Blood pressure slightly elevated at 135/85.',
        treatment: 'Lifestyle modifications recommended. Increase physical activity and reduce sodium intake.',
        prescription: 'Lisinopril 5mg once daily if BP remains elevated after 4 weeks.',
        followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: patient1User.id,
          type: 'APPOINTMENT_CREATED',
          title: 'Appointment Scheduled',
          message: 'Your appointment with Dr. Smith is scheduled for tomorrow.',
          isRead: false,
        },
        {
          userId: patient1User.id,
          type: 'APPOINTMENT_COMPLETED',
          title: 'Appointment Completed',
          message: 'Your appointment with Dr. Johnson has been completed. Medical records are available.',
          isRead: true,
        },
        {
          userId: patient2User.id,
          type: 'APPOINTMENT_CONFIRMED',
          title: 'Appointment Confirmed',
          message: 'Your upcoming appointment with Dr. Johnson has been confirmed.',
          isRead: false,
        },
        {
          userId: doctor1User.id,
          type: 'APPOINTMENT_CREATED',
          title: 'New Appointment',
          message: 'New appointment scheduled with John Doe.',
          isRead: false,
        },
      ],
    });

    console.log('✅ Demo appointments, medical records and notifications created.');
  } else {
    console.log('ℹ️  Appointments already exist — skipping demo appointment creation.');
  }

  // ------------------------------------------------------------------
  // 6. Audit log for this seed run
  // ------------------------------------------------------------------
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SEED',
      resource: 'database',
      details: { note: 'Idempotent seed completed', timestamp: new Date().toISOString() },
    },
  });

  console.log('\n✅ Database seeded successfully.');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:   admin@caresync.com      / Admin@123');
  console.log('  Doctor:  dr.smith@caresync.com   / Doctor@123');
  console.log('  Doctor:  dr.johnson@caresync.com / Doctor@123');
  console.log('  Patient: patient1@caresync.com   / Patient@123');
  console.log('  Patient: patient2@caresync.com   / Patient@123');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
