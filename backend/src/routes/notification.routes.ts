import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications for current user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notifications list
 */
router.get('/', authenticateToken, notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get count of unread notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: integer }
 */
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.patch('/mark-all-read', authenticateToken, notificationController.markAllRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch('/:id/read', authenticateToken, notificationController.markAsRead);

export default router;
