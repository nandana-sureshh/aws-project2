export type NotificationType =
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_COMPLETED'
  | 'DOCUMENT_UPLOADED'
  | 'RECORD_ADDED'
  | 'SYSTEM';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;

  sendBulk(payloads: NotificationPayload[]): Promise<void>;

  getUnread(userId: string): Promise<NotificationRecord[]>;

  markAsRead(notificationId: string, userId: string): Promise<void>;

  markAllAsRead(userId: string): Promise<void>;

  getAll(userId: string, page: number, limit: number): Promise<{ notifications: NotificationRecord[]; total: number }>;

  getUnreadCount(userId: string): Promise<number>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}
