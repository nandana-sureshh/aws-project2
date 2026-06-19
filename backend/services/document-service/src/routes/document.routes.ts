import { Router } from 'express';
import { authenticateToken, uploadMiddleware } from '@caresync/shared';
import * as documentController from '../controllers/document.controller';

const router = Router();

router.post('/presigned-url', authenticateToken, documentController.getUploadUrl);
router.post('/confirm-upload', authenticateToken, documentController.confirmUpload);
router.post('/', authenticateToken, uploadMiddleware, documentController.upload);
router.get('/', authenticateToken, documentController.getMyDocuments);
router.get('/:id/download', authenticateToken, documentController.download);
router.delete('/:id', authenticateToken, documentController.remove);

export default router;
