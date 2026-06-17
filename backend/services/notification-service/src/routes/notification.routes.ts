import { Router } from 'express';
import { authenticateToken } from '@caresync/shared';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.patch('/mark-all-read', authenticateToken, notificationController.markAllRead);
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);

export default router;
