import { Request, Response, NextFunction } from 'express';
import * as doctorService from '../services/doctor.service';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await doctorService.getDoctorProfile(req.user!.userId);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await doctorService.updateDoctorProfile(req.user!.userId, req.body);
    res.status(200).json({ data, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await doctorService.getDoctorAppointments(req.user!.userId, req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await doctorService.getDoctorById(req.params.id as string);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAllDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await doctorService.getAllDoctors(req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
