import { Router } from 'express';
import { authenticateToken, requireRole } from '@caresync/shared';
import * as medicalRecordController from '../controllers/medicalRecord.controller';

const router = Router();

router.post('/', authenticateToken, requireRole(['DOCTOR']), medicalRecordController.createRecord);
router.get('/my', authenticateToken, requireRole(['PATIENT']), medicalRecordController.getMyRecords);
router.get('/:id', authenticateToken, medicalRecordController.getRecord);
router.patch('/:id', authenticateToken, requireRole(['DOCTOR']), medicalRecordController.updateRecord);

export default router;
