import { NotificationProvider } from '../providers/interfaces/NotificationProvider';

export async function getNotifications(
  userId: string,
  query: { page?: string; limit?: string },
  notificationProvider: NotificationProvider
) {
  const page = parseInt(query.page ?? '1', 10);
  const limit = parseInt(query.limit ?? '10', 10);

  const { notifications, total } = await notificationProvider.getAll(userId, page, limit);

  return {
    data: notifications,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUnreadCount(userId: string, notificationProvider: NotificationProvider) {
  return notificationProvider.getUnreadCount(userId);
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  notificationProvider: NotificationProvider
) {
  await notificationProvider.markAsRead(notificationId, userId);
}

export async function markAllRead(userId: string, notificationProvider: NotificationProvider) {
  await notificationProvider.markAllAsRead(userId);
}
