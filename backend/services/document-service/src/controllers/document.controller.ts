import { Request, Response, NextFunction } from 'express';
import * as documentService from '../services/document.service';
import { createStorageProvider, createNotificationProvider, prisma } from '@caresync/shared';

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

export async function getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { originalName, mimeType } = req.body;
    if (!originalName || !mimeType) {
      res.status(400).json({ error: 'Bad Request', message: 'originalName and mimeType are required', statusCode: 400 });
      return;
    }

    const data = await documentService.generateUploadUrl(originalName, mimeType, storageProvider);
    res.status(200).json({ data, message: 'Upload URL generated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function confirmUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await documentService.confirmUpload(req.user!.userId, req.body, notificationProvider);
    res.status(201).json({ data, message: 'Upload confirmed successfully' });
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
