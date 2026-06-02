import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  parsePagination,
} from '../utils/validators';
import { createAuditLog } from '../utils/audit';
import { NotificationProvider } from '../providers/interfaces/NotificationProvider';

export async function createMedicalRecord(
  userId: string,
  body: unknown,
  notificationProvider: NotificationProvider
) {
  const data = createMedicalRecordSchema.parse(body);

  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new AppError('Doctor profile not found', 404, 'Not Found');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    include: {
      patient: { include: { user: { select: { id: true } } } },
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404, 'Not Found');
  }

  if (appointment.doctorId !== doctor.id) {
    throw new AppError('You can only add records for your own appointments', 403, 'Forbidden');
  }

  const existing = await prisma.medicalRecord.findUnique({
    where: { appointmentId: data.appointmentId },
  });

  if (existing) {
    throw new AppError('Medical record already exists for this appointment', 409, 'Conflict');
  }

  const record = await prisma.medicalRecord.create({
    data: {
      appointmentId: data.appointmentId,
      patientId: appointment.patientId,
      doctorId: doctor.id,
      diagnosis: data.diagnosis,
      notes: data.notes,
      treatment: data.treatment,
      prescription: data.prescription,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
  });

  await notificationProvider.send({
    userId: appointment.patient.user.id,
    type: 'RECORD_ADDED',
    title: 'Medical Record Added',
    message: 'Your doctor has added a medical record for your recent appointment.',
  });

  await createAuditLog({
    userId,
    action: 'CREATE',
    resource: 'medical_records',
    resourceId: record.id,
  });

  return record;
}

export async function updateMedicalRecord(
  recordId: string,
  userId: string,
  body: unknown
) {
  const data = updateMedicalRecordSchema.parse(body);

  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new AppError('Doctor profile not found', 404, 'Not Found');
  }

  const record = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
  if (!record) {
    throw new AppError('Medical record not found', 404, 'Not Found');
  }

  if (record.doctorId !== doctor.id) {
    throw new AppError('You can only update your own medical records', 403, 'Forbidden');
  }

  const updated = await prisma.medicalRecord.update({
    where: { id: recordId },
    data: {
      ...(data.diagnosis !== undefined && { diagnosis: data.diagnosis }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.treatment !== undefined && { treatment: data.treatment }),
      ...(data.prescription !== undefined && { prescription: data.prescription }),
      ...(data.followUpDate !== undefined && {
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      }),
    },
  });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    resource: 'medical_records',
    resourceId: recordId,
  });

  return updated;
}

export async function getMedicalRecordById(recordId: string) {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: recordId },
    include: {
      appointment: true,
      patient: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      doctor: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      documents: true,
    },
  });

  if (!record) {
    throw new AppError('Medical record not found', 404, 'Not Found');
  }

  return record;
}

export async function getPatientMedicalRecords(userId: string, query: { page?: string; limit?: string }) {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new AppError('Patient not found', 404, 'Not Found');
  }

  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        appointment: { select: { scheduledAt: true, reason: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.medicalRecord.count({ where: { patientId: patient.id } }),
  ]);

  return {
    data: records,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
