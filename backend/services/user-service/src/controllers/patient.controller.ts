import { Request, Response, NextFunction } from 'express';
import * as patientService from '../services/patient.service';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await patientService.getPatientProfile(req.user!.userId);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await patientService.updatePatientProfile(req.user!.userId, req.body);
    res.status(200).json({ data, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await patientService.getPatientAppointments(req.user!.userId, req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await patientService.getPatientById(req.params.id as string);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAllPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await patientService.getAllPatients(req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
