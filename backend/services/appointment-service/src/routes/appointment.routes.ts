import { Router } from 'express';
import { authenticateToken, requireRole } from '@caresync/shared';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router();

router.post('/', authenticateToken, requireRole(['PATIENT']), appointmentController.createAppointment);
router.get('/', authenticateToken, requireRole(['ADMIN']), appointmentController.getAllAppointments);
router.get('/:id', authenticateToken, appointmentController.getAppointment);
router.patch('/:id', authenticateToken, appointmentController.updateAppointment);

export default router;
