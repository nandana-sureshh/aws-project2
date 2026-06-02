import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router();

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Create a new appointment (Patient only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, scheduledAt, reason]
 *             properties:
 *               doctorId: { type: string, format: uuid }
 *               scheduledAt: { type: string, format: date-time }
 *               reason: { type: string }
 *               duration: { type: integer, minimum: 15, maximum: 120 }
 *     responses:
 *       201:
 *         description: Appointment created
 *       409:
 *         description: Time slot conflict
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments (Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Appointments list
 */
router.post('/', authenticateToken, requireRole(['PATIENT']), appointmentController.createAppointment);
router.get('/', authenticateToken, requireRole(['ADMIN']), appointmentController.getAllAppointments);

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Appointment details
 *       404:
 *         description: Not found
 *   patch:
 *     tags: [Appointments]
 *     summary: Update appointment status or notes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [SCHEDULED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW] }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Appointment updated
 */
router.get('/:id', authenticateToken, appointmentController.getAppointment);
router.patch('/:id', authenticateToken, requireRole(['ADMIN', 'DOCTOR', 'PATIENT']), appointmentController.updateAppointment);

export default router;
