import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import * as documentController from '../controllers/document.controller';

const router = Router();

/**
 * @swagger
 * /api/documents:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a document
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               medicalRecordId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: No file provided or invalid file type
 *   get:
 *     tags: [Documents]
 *     summary: Get current user's documents
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
 *         description: Documents list
 */
router.post('/', authenticateToken, uploadMiddleware, documentController.upload);
router.get('/', authenticateToken, documentController.getMyDocuments);

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     tags: [Documents]
 *     summary: Download a document by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: File binary returned
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Document not found
 */
router.get('/:id/download', authenticateToken, documentController.download);

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Document deleted
 *       403:
 *         description: Access denied
 */
router.delete('/:id', authenticateToken, documentController.remove);

export default router;
