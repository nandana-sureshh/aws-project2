import {
  prisma,
  AppError,
  updateDoctorProfileSchema,
  parsePagination,
  createAuditLog,
} from '@caresync/shared';

export async function getDoctorProfile(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
      },
    },
  });

  if (!doctor) {
    throw new AppError('Doctor profile not found', 404, 'Not Found');
  }

  return doctor;
}

export async function getDoctorById(doctorId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  if (!doctor) {
    throw new AppError('Doctor not found', 404, 'Not Found');
  }

  return doctor;
}

export async function updateDoctorProfile(userId: string, body: unknown) {
  const data = updateDoctorProfileSchema.parse(body);

  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new AppError('Doctor profile not found', 404, 'Not Found');
  }

  const updated = await prisma.doctor.update({
    where: { userId },
    data,
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  await createAuditLog({
    userId,
    action: 'UPDATE',
    resource: 'doctors',
    resourceId: doctor.id,
  });

  return updated;
}

export async function getDoctorAppointments(userId: string, query: { page?: string; limit?: string; status?: string }) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new AppError('Doctor not found', 404, 'Not Found');
  }

  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { doctorId: doctor.id };
  if (query.status) {
    where.status = query.status;
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                documents: {
                  select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    size: true,
                    uploadedAt: true,
                    aiSummary: true,
                    aiSummaryStatus: true
                  },
                  orderBy: { uploadedAt: 'desc' }
                }
              }
            }
          }
        },
        medicalRecord: true,
      },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    data: appointments,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAllDoctors(query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
        },
      },
      where: { isAvailable: true },
      skip,
      take: limit,
      orderBy: { specialization: 'asc' },
    }),
    prisma.doctor.count({ where: { isAvailable: true } }),
  ]);

  return {
    data: doctors,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getAllDoctorsAdmin(query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [doctors, total] = await Promise.all([
    prisma.doctor.findMany({
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.doctor.count(),
  ]);

  return {
    data: doctors,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
