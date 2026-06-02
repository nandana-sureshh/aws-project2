import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { parsePagination } from '../utils/validators';
import { createAuditLog } from '../utils/audit';
import { z } from 'zod';

export async function getDashboardStats() {
  const [totalUsers, totalPatients, totalDoctors, totalAppointments, recentAuditLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.appointment.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

  const appointmentsByStatus = await prisma.appointment.groupBy({
    by: ['status'],
    _count: true,
  });

  return {
    stats: { totalUsers, totalPatients, totalDoctors, totalAppointments },
    appointmentsByStatus: appointmentsByStatus.map((a) => ({
      status: a.status,
      count: a._count,
    })),
    recentActivity: recentAuditLogs,
  };
}

export async function getAllUsers(query: { page?: string; limit?: string; role?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (query.role) {
    where.role = query.role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function toggleUserStatus(targetUserId: string, adminUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    throw new AppError('User not found', 404, 'Not Found');
  }

  if (user.role === 'ADMIN') {
    throw new AppError('Cannot deactivate admin accounts', 403, 'Forbidden');
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, isActive: true },
  });

  await createAuditLog({
    userId: adminUserId,
    action: updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    resource: 'users',
    resourceId: targetUserId,
  });

  return updated;
}

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  specialization: z.string().min(1),
  licenseNumber: z.string().min(1),
  phone: z.string().optional(),
  department: z.string().optional(),
});

export async function createDoctor(body: unknown, adminUserId: string) {
  const data = createDoctorSchema.parse(body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email already registered', 409, 'Conflict');
  }

  const existingLicense = await prisma.doctor.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existingLicense) {
    throw new AppError('License number already registered', 409, 'Conflict');
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      role: Role.DOCTOR,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });

  const doctor = await prisma.doctor.create({
    data: {
      userId: user.id,
      specialization: data.specialization,
      licenseNumber: data.licenseNumber,
      phone: data.phone,
      department: data.department,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  await createAuditLog({
    userId: adminUserId,
    action: 'CREATE',
    resource: 'doctors',
    resourceId: doctor.id,
    details: { email: data.email, licenseNumber: data.licenseNumber },
  });

  return doctor;
}

export async function getAuditLogs(query: { page?: string; limit?: string }) {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
