// Config
export { default as prisma } from './config/database';
export { initSecrets } from './config/secrets';
export {
  createStorageProvider,
  createNotificationProvider,
  createEventProvider,
  createQueueProvider,
} from './config/providers';

// Middleware
export { authenticateToken } from './middleware/auth.middleware';
export {
  globalErrorHandler,
  notFoundHandler,
  AppError,
} from './middleware/error.middleware';
export { requireRole } from './middleware/role.middleware';
export { uploadMiddleware, uploadMultipleMiddleware } from './middleware/upload.middleware';

// Types
export type {
  JwtPayload,
  AuthenticatedRequest,
  PaginationQuery,
  ApiResponse,
  PaginatedResponse,
} from './types';
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';

// Utils
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './utils/jwt';
export { createAuditLog } from './utils/audit';
export {
  parsePagination,
  loginSchema,
  registerSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  updatePatientProfileSchema,
  updateDoctorProfileSchema,
  paginationSchema,
} from './utils/validators';

// Provider interfaces
export type { StorageProvider, UploadedFile } from './providers/interfaces/StorageProvider';
export type { NotificationProvider, NotificationPayload, NotificationRecord, NotificationType } from './providers/interfaces/NotificationProvider';
export type { EventProvider, AppEvent } from './providers/interfaces/EventProvider';
export type { QueueProvider, QueueMessage } from './providers/interfaces/QueueProvider';

// Provider implementations
export { LocalStorageProvider } from './providers/implementations/LocalStorageProvider';
export { S3StorageProvider } from './providers/implementations/S3StorageProvider';
export { DatabaseNotificationProvider } from './providers/implementations/DatabaseNotificationProvider';
export { ConsoleEventProvider } from './providers/implementations/ConsoleEventProvider';
export { LocalQueueProvider } from './providers/implementations/LocalQueueProvider';
export { HttpMockQueueProvider } from './providers/implementations/HttpMockQueueProvider';
export { SQSQueueProvider } from './providers/implementations/SQSQueueProvider';
