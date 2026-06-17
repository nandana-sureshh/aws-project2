import { Router } from 'express';
import { authenticateToken, requireRole } from '@caresync/shared';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.get('/stats', authenticateToken, requireRole(['ADMIN']), adminController.getDashboardStats);
router.get('/users', authenticateToken, requireRole(['ADMIN']), adminController.getAllUsers);
router.patch('/users/:id/toggle-status', authenticateToken, requireRole(['ADMIN']), adminController.toggleUserStatus);
router.post('/doctors', authenticateToken, requireRole(['ADMIN']), adminController.createDoctor);
router.get('/audit-logs', authenticateToken, requireRole(['ADMIN']), adminController.getAuditLogs);

export default router;
