import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getDashboardStats();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getAllUsers(req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.toggleUserStatus(req.params.id as string, req.user!.userId);
    res.status(200).json({ data, message: `User ${data.isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    next(err);
  }
}

export async function createDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.createDoctor(req.body, req.user!.userId);
    res.status(201).json({ data, message: 'Doctor created successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await adminService.getAuditLogs(req.query as any);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}
