import { Request, Response, NextFunction } from 'express';
import * as documentService from '../services/document.service';
import { createStorageProvider, createNotificationProvider } from '../config/providers';
import prisma from '../config/database';

const storageProvider = createStorageProvider();
const notificationProvider = createNotificationProvider(prisma);

export async function upload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Bad Request', message: 'No file provided', statusCode: 400 });
      return;
    }

    const data = await documentService.uploadDocument(
      req.user!.userId,
      req.file,
      {
        appointmentId: req.body.appointmentId,
        medicalRecordId: req.body.medicalRecordId,
      },
      storageProvider,
      notificationProvider
    );

    res.status(201).json({ data, message: 'File uploaded successfully' });
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { buffer, document } = await documentService.downloadDocument(
      req.params.id as string,
      req.user!.userId,
      req.user!.role,
      storageProvider
    );

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalName}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await documentService.deleteDocument(
      req.params.id as string,
      req.user!.userId,
      req.user!.role,
      storageProvider
    );
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await documentService.getUserDocuments(req.user!.userId, req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
