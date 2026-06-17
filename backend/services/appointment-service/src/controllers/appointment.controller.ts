import { Request, Response, NextFunction } from 'express';
import * as appointmentService from '../services/appointment.service';
import { createNotificationProvider, createEventProvider, prisma } from '@caresync/shared';

const notificationProvider = createNotificationProvider(prisma);
const eventProvider = createEventProvider();

export async function createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await appointmentService.createAppointment(
      req.user!.userId,
      req.body,
      notificationProvider,
      eventProvider
    );
    res.status(201).json({ data, message: 'Appointment created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await appointmentService.updateAppointment(
      req.params.id as string,
      req.user!.userId,
      req.user!.role,
      req.body,
      notificationProvider,
      eventProvider
    );
    res.status(200).json({ data, message: 'Appointment updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await appointmentService.getAppointmentById(req.params.id as string);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAllAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await appointmentService.getAllAppointments(req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
