import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as medicalRecordController from '../controllers/medicalRecord.controller';

const router = Router();

/**
 * @swagger
 * /api/records:
 *   post:
 *     tags: [Medical Records]
 *     summary: Create a medical record for an appointment (Doctor only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId]
 *             properties:
 *               appointmentId: { type: string, format: uuid }
 *               diagnosis: { type: string }
 *               notes: { type: string }
 *               treatment: { type: string }
 *               prescription: { type: string }
 *               followUpDate: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Medical record created
 */
router.post('/', authenticateToken, requireRole(['DOCTOR']), medicalRecordController.createRecord);

/**
 * @swagger
 * /api/records/my:
 *   get:
 *     tags: [Medical Records]
 *     summary: Get current patient's medical records
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
 *         description: Medical records list
 */
router.get('/my', authenticateToken, requireRole(['PATIENT']), medicalRecordController.getMyRecords);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     tags: [Medical Records]
 *     summary: Get medical record by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Medical record details
 *   patch:
 *     tags: [Medical Records]
 *     summary: Update a medical record (Doctor only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Record updated
 */
router.get('/:id', authenticateToken, medicalRecordController.getRecord);
router.patch('/:id', authenticateToken, requireRole(['DOCTOR']), medicalRecordController.updateRecord);

export default router;
