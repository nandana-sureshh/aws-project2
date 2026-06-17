import { PrismaClient, Prisma } from '@prisma/client';
import {
  NotificationProvider,
  NotificationPayload,
  NotificationRecord,
} from '../interfaces/NotificationProvider';

export class DatabaseNotificationProvider implements NotificationProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async send(payload: NotificationPayload): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as any,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async sendBulk(payloads: NotificationPayload[]): Promise<void> {
    await this.prisma.notification.createMany({
      data: payloads.map((p) => ({
        userId: p.userId,
        type: p.type as any,
        title: p.title,
        message: p.message,
        metadata: p.metadata ? (p.metadata as Prisma.InputJsonValue) : undefined,
      })),
    });
  }

  async getUnread(userId: string): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
    }) as Promise<NotificationRecord[]>;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getAll(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ notifications: NotificationRecord[]; total: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { notifications: notifications as NotificationRecord[], total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
