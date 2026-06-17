import { AppointmentStatus } from '@prisma/client';
import {
  prisma,
  AppError,
  createAppointmentSchema,
  updateAppointmentSchema,
  parsePagination,
  createAuditLog,
  NotificationProvider,
  EventProvider,
} from '@caresync/shared';

export async function createAppointment(
  userId: string,
  body: unknown,
  notificationProvider: NotificationProvider,
  eventProvider: EventProvider
) {
  const data = createAppointmentSchema.parse(body);

  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new AppError('Patient profile not found', 404, 'Not Found');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: data.doctorId },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!doctor || !doctor.isAvailable) {
    throw new AppError('Doctor not found or unavailable', 404, 'Not Found');
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (scheduledAt <= new Date()) {
    throw new AppError('Appointment must be scheduled in the future', 400, 'Bad Request');
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: data.doctorId,
      scheduledAt,
      status: { notIn: ['CANCELLED'] },
    },
  });

  if (conflict) {
    throw new AppError('Doctor already has an appointment at this time', 409, 'Conflict');
  }

  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: data.doctorId,
      scheduledAt,
      reason: data.reason,
      duration: data.duration ?? 30,
    },
    include: {
      doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
      patient: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  const doctorName = `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`;

  await notificationProvider.sendBulk([
    {
      userId,
      type: 'APPOINTMENT_CREATED',
      title: 'Appointment Scheduled',
      message: `Your appointment with ${doctorName} is scheduled for ${scheduledAt.toLocaleDateString()}.`,
    },
    {
      userId: doctor.user.id,
      type: 'APPOINTMENT_CREATED',
      title: 'New Appointment',
      message: `New appointment with ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} scheduled for ${scheduledAt.toLocaleDateString()}.`,
    },
  ]);

  await eventProvider.publish({
    source: 'caresync.appointments',
    detailType: 'AppointmentCreated',
    detail: { appointmentId: appointment.id, patientId: patient.id, doctorId: data.doctorId },
  });

  await createAuditLog({
    userId,
    action: 'CREATE',
    resource: 'appointments',
    resourceId: appointment.id,
  });

  return appointment;
}

export async function updateAppointment(
  appointmentId: string,
  userId: string,
  role: string,
  body: unknown,
  notificationProvider: NotificationProvider,
  eventProvider: EventProvider
) {
  const data = updateAppointmentSchema.parse(body);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      doctor: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404, 'Not Found');
  }

  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (appointment.patientId !== patient?.id) {
      throw new AppError('You can only update your own appointments', 403, 'Forbidden');
    }
    if (data.status && !['CANCELLED'].includes(data.status)) {
      throw new AppError('Patients can only cancel appointments', 403, 'Forbidden');
    }
  }

  if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (appointment.doctorId !== doctor?.id) {
      throw new AppError('You can only update your own appointments', 403, 'Forbidden');
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(data.status && { status: data.status as AppointmentStatus }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
    },
    include: {
      patient: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      doctor: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });

  if (data.status) {
    const typeMap: Record<string, string> = {
      CANCELLED: 'APPOINTMENT_CANCELLED',
      CONFIRMED: 'APPOINTMENT_CONFIRMED',
      COMPLETED: 'APPOINTMENT_COMPLETED',
    };
    const notifType = typeMap[data.status];

    if (notifType) {
      await notificationProvider.sendBulk([
        {
          userId: updated.patient.user.id,
          type: notifType as any,
          title: `Appointment ${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`,
          message: `Your appointment has been ${data.status.toLowerCase()}.`,
        },
        {
          userId: updated.doctor.user.id,
          type: notifType as any,
          title: `Appointment ${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`,
          message: `Appointment with ${updated.patient.user.firstName} ${updated.patient.user.lastName} has been ${data.status.toLowerCase()}.`,
        },
      ]);
    }

    await eventProvider.publish({
      source: 'caresync.appointments',
      detailType: `Appointment${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`,
      detail: { appointmentId },
    });
  }

  await createAuditLog({
    userId,
    action: 'UPDATE',
    resource: 'appointments',
    resourceId: appointmentId,
    details: data as Record<string, unknown>,
  });

  return updated;
}

export async function getAppointmentById(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      doctor: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      medicalRecord: true,
      documents: true,
    },
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404, 'Not Found');
  }

  return appointment;
}

export async function getAllAppointments(query: { page?: string; limit?: string; status?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.status) {
    where.status = query.status;
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        doctor: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { scheduledAt: 'desc' },
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
