import {
  prisma,
  AppError,
  updatePatientProfileSchema,
  parsePagination,
  createAuditLog,
} from '@caresync/shared';

export async function getPatientProfile(userId: string) {
  const patient = await prisma.patient.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      },
    },
  });

  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'Not Found');
  }

  return patient;
}

export async function getPatientById(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!patient) {
    throw new AppError('Patient not found', 404, 'Not Found');
  }

  return patient;
}

export async function updatePatientProfile(userId: string, body: unknown) {
  const data = updatePatientProfileSchema.parse(body);

  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'Not Found');
  }

  const updated = await prisma.patient.update({
    where: { userId },
    data: {
      ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      ...(data.gender && { gender: data.gender }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
      ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    resource: 'patients',
    resourceId: patient.id,
  });

  return updated;
}

export async function getPatientAppointments(userId: string, query: { page?: string; limit?: string }) {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new AppError('Patient not found', 404, 'Not Found');
  }

  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        medicalRecord: true,
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where: { patientId: patient.id } }),
  ]);

  return {
    data: appointments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAllPatients(query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.patient.count(),
  ]);

  return {
    data: patients,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
