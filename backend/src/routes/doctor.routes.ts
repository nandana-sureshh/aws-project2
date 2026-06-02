import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as doctorController from '../controllers/doctor.controller';

const router = Router();

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     tags: [Doctors]
 *     summary: Get all available doctors (all authenticated users)
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
 *         description: List of available doctors
 */
router.get('/', authenticateToken, doctorController.getAllDoctors);

/**
 * @swagger
 * /api/doctors/profile:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor's own profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile returned
 *   put:
 *     tags: [Doctors]
 *     summary: Update doctor's own profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile', authenticateToken, requireRole(['DOCTOR']), doctorController.getProfile);
router.put('/profile', authenticateToken, requireRole(['DOCTOR']), doctorController.updateProfile);

/**
 * @swagger
 * /api/doctors/appointments:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor's appointments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [SCHEDULED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Doctor's appointments
 */
router.get('/appointments', authenticateToken, requireRole(['DOCTOR']), doctorController.getAppointments);

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Doctor details
 */
router.get('/:id', authenticateToken, doctorController.getDoctorById);

export default router;
