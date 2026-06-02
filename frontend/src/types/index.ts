export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  patient?: PatientProfile;
  doctor?: DoctorProfile;
}

export interface PatientProfile {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  phone?: string;
  department?: string;
  bio?: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  reason: string;
  notes?: string;
  duration: number;
  createdAt: string;
  patient?: { user: { firstName: string; lastName: string; email: string } };
  doctor?: { user: { firstName: string; lastName: string; email: string }; specialization: string; department?: string };
  medicalRecord?: MedicalRecord;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  diagnosis?: string;
  notes?: string;
  treatment?: string;
  prescription?: string;
  followUpDate?: string;
  createdAt: string;
  doctor?: { user: { firstName: string; lastName: string } };
  appointment?: { scheduledAt: string; reason: string };
  documents?: Document[];
}

export interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedAt: string;
  url?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string; role: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
