import { Router } from 'express';
import { authenticateToken, requireRole } from '@caresync/shared';
import * as doctorController from '../controllers/doctor.controller';

const router = Router();

router.get('/', authenticateToken, doctorController.getAllDoctors);
router.get('/profile', authenticateToken, requireRole(['DOCTOR']), doctorController.getProfile);
router.put('/profile', authenticateToken, requireRole(['DOCTOR']), doctorController.updateProfile);
router.get('/appointments', authenticateToken, requireRole(['DOCTOR']), doctorController.getAppointments);
router.get('/:id', authenticateToken, doctorController.getDoctorById);

export default router;
