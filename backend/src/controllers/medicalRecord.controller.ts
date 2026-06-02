import { Request, Response, NextFunction } from 'express';
import * as medicalRecordService from '../services/medicalRecord.service';
import { createNotificationProvider } from '../config/providers';
import prisma from '../config/database';

const notificationProvider = createNotificationProvider(prisma);

export async function createRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await medicalRecordService.createMedicalRecord(
      req.user!.userId,
      req.body,
      notificationProvider
    );
    res.status(201).json({ data, message: 'Medical record created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await medicalRecordService.updateMedicalRecord(
      req.params.id as string,
      req.user!.userId,
      req.body
    );
    res.status(200).json({ data, message: 'Medical record updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await medicalRecordService.getMedicalRecordById(req.params.id as string);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getMyRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await medicalRecordService.getPatientMedicalRecords(req.user!.userId, req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
