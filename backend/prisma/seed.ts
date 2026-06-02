import { PrismaClient, Role, Gender, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const doctorPassword = await bcrypt.hash('Doctor@123', SALT_ROUNDS);
  const patientPassword = await bcrypt.hash('Patient@123', SALT_ROUNDS);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@caresync.com',
      password: adminPassword,
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
  });

  const doctor1User = await prisma.user.create({
    data: {
      email: 'dr.smith@caresync.com',
      password: doctorPassword,
      role: Role.DOCTOR,
      firstName: 'James',
      lastName: 'Smith',
      isActive: true,
    },
  });

  const doctor2User = await prisma.user.create({
    data: {
      email: 'dr.johnson@caresync.com',
      password: doctorPassword,
      role: Role.DOCTOR,
      firstName: 'Emily',
      lastName: 'Johnson',
      isActive: true,
    },
  });

  const patient1User = await prisma.user.create({
    data: {
      email: 'patient1@caresync.com',
      password: patientPassword,
      role: Role.PATIENT,
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
    },
  });

  const patient2User = await prisma.user.create({
    data: {
      email: 'patient2@caresync.com',
      password: patientPassword,
      role: Role.PATIENT,
      firstName: 'Jane',
      lastName: 'Doe',
      isActive: true,
    },
  });

  const doctor1 = await prisma.doctor.create({
    data: {
      userId: doctor1User.id,
      specialization: 'Cardiology',
      licenseNumber: 'LIC-DOC-001',
      phone: '+1-555-0101',
      department: 'Cardiology',
      bio: 'Board-certified cardiologist with 15 years of experience.',
      isAvailable: true,
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      userId: doctor2User.id,
      specialization: 'General Medicine',
      licenseNumber: 'LIC-DOC-002',
      phone: '+1-555-0102',
      department: 'General Medicine',
      bio: 'General practitioner specializing in preventive care.',
      isAvailable: true,
    },
  });

  const patient1 = await prisma.patient.create({
    data: {
      userId: patient1User.id,
      dateOfBirth: new Date('1985-06-15'),
      gender: Gender.MALE,
      phone: '+1-555-0201',
      address: '123 Main St, Springfield, IL 62701',
      bloodGroup: 'O+',
      emergencyContact: '+1-555-0202',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      userId: patient2User.id,
      dateOfBirth: new Date('1990-03-22'),
      gender: Gender.FEMALE,
      phone: '+1-555-0301',
      address: '456 Oak Ave, Springfield, IL 62702',
      bloodGroup: 'A+',
      emergencyContact: '+1-555-0302',
    },
  });

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

  const appointment3 = await prisma.appointment.create({
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
        message: `Your appointment with Dr. Smith is scheduled for tomorrow.`,
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

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'CREATE',
        resource: 'users',
        details: { note: 'System initialization' },
      },
      {
        userId: adminUser.id,
        action: 'SEED',
        resource: 'database',
        details: { note: 'Demo data seeded successfully' },
      },
    ],
  });

  console.log('✅ Database seeded successfully.');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:   admin@caresync.com     / Admin@123');
  console.log('  Doctor:  dr.smith@caresync.com  / Doctor@123');
  console.log('  Doctor:  dr.johnson@caresync.com / Doctor@123');
  console.log('  Patient: patient1@caresync.com  / Patient@123');
  console.log('  Patient: patient2@caresync.com  / Patient@123');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
