import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['DOCTOR', 'PATIENT']),
});

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  reason: z.string().min(1, 'Reason is required').max(500),
  duration: z.number().int().min(15).max(120).optional(),
});

export const updateAppointmentSchema = z.object({
  status: z
    .enum(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
    .optional(),
  notes: z.string().max(1000).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const createMedicalRecordSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  diagnosis: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  treatment: z.string().max(1000).optional(),
  prescription: z.string().max(1000).optional(),
  followUpDate: z.string().datetime().optional(),
});

export const updateMedicalRecordSchema = z.object({
  diagnosis: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  treatment: z.string().max(1000).optional(),
  prescription: z.string().max(1000).optional(),
  followUpDate: z.string().datetime().optional().nullable(),
});

export const updatePatientProfileSchema = z.object({
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  bloodGroup: z.string().max(5).optional(),
  emergencyContact: z.string().max(20).optional(),
});

export const updateDoctorProfileSchema = z.object({
  specialization: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  isAvailable: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export function parsePagination(query: { page?: string; limit?: string }) {
  return paginationSchema.parse(query);
}
