import { Router } from 'express';
import { authenticateToken, requireRole } from '@caresync/shared';
import * as patientController from '../controllers/patient.controller';

const router = Router();

router.get('/profile', authenticateToken, requireRole(['PATIENT']), patientController.getProfile);
router.put('/profile', authenticateToken, requireRole(['PATIENT']), patientController.updateProfile);
router.get('/appointments', authenticateToken, requireRole(['PATIENT']), patientController.getAppointments);
router.get('/', authenticateToken, requireRole(['ADMIN', 'DOCTOR']), patientController.getAllPatients);
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'DOCTOR']), patientController.getPatientById);

export default router;
