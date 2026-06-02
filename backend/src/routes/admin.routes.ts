import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stats returned
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN']), adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [ADMIN, DOCTOR, PATIENT] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Users list
 */
router.get('/users', authenticateToken, requireRole(['ADMIN']), adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}/toggle-status:
 *   patch:
 *     tags: [Admin]
 *     summary: Activate or deactivate a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Status toggled
 */
router.patch('/users/:id/toggle-status', authenticateToken, requireRole(['ADMIN']), adminController.toggleUserStatus);

/**
 * @swagger
 * /api/admin/doctors:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new doctor account
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, specialization, licenseNumber]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               specialization: { type: string }
 *               licenseNumber: { type: string }
 *               phone: { type: string }
 *               department: { type: string }
 *     responses:
 *       201:
 *         description: Doctor created
 */
router.post('/doctors', authenticateToken, requireRole(['ADMIN']), adminController.createDoctor);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get audit logs
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
 *         description: Audit logs
 */
router.get('/audit-logs', authenticateToken, requireRole(['ADMIN']), adminController.getAuditLogs);

export default router;
