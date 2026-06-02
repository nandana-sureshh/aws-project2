import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as patientController from '../controllers/patient.controller';

const router = Router();

/**
 * @swagger
 * /api/patients/profile:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient's own profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile returned
 *   put:
 *     tags: [Patients]
 *     summary: Update patient's own profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone: { type: string }
 *               address: { type: string }
 *               bloodGroup: { type: string }
 *               gender: { type: string, enum: [MALE, FEMALE, OTHER] }
 *               emergencyContact: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get('/profile', authenticateToken, requireRole(['PATIENT']), patientController.getProfile);
router.put('/profile', authenticateToken, requireRole(['PATIENT']), patientController.updateProfile);

/**
 * @swagger
 * /api/patients/appointments:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient's appointments
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
 *         description: Appointments list returned
 */
router.get('/appointments', authenticateToken, requireRole(['PATIENT']), patientController.getAppointments);

/**
 * @swagger
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: Get all patients (Admin/Doctor only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Patients list
 */
router.get('/', authenticateToken, requireRole(['ADMIN', 'DOCTOR']), patientController.getAllPatients);

/**
 * @swagger
 * /api/patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient by ID (Admin/Doctor only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Patient found
 *       404:
 *         description: Patient not found
 */
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'DOCTOR']), patientController.getPatientById);

export default router;
