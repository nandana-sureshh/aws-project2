import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { createNotificationProvider, prisma } from '@caresync/shared';

const notificationProvider = createNotificationProvider(prisma);

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await notificationService.getNotifications(
      req.user!.userId,
      req.query as any,
      notificationProvider
    );
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId, notificationProvider);
    res.status(200).json({ data: { count } });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.markNotificationRead(
      req.params.id as string,
      req.user!.userId,
      notificationProvider
    );
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.markAllRead(req.user!.userId, notificationProvider);
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}
