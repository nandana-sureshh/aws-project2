import apiClient from './client';
import { User, AuditLog, PaginatedResponse } from '../types';

export const adminApi = {
  getStats: async (): Promise<{
    data: {
      stats: { totalUsers: number; totalPatients: number; totalDoctors: number; totalAppointments: number };
      appointmentsByStatus: { status: string; count: number }[];
      recentActivity: AuditLog[];
    };
  }> => {
    const { data } = await apiClient.get('/admin/stats');
    return data;
  },

  getUsers: async (params?: { page?: number; limit?: number; role?: string }): Promise<PaginatedResponse<User>> => {
    const { data } = await apiClient.get('/admin/users', { params });
    return data;
  },

  toggleUserStatus: async (id: string): Promise<{ data: { id: string; email: string; isActive: boolean } }> => {
    const { data } = await apiClient.patch(`/admin/users/${id}/toggle-status`);
    return data;
  },

  createDoctor: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    specialization: string;
    licenseNumber: string;
    phone?: string;
    department?: string;
  }): Promise<{ data: unknown }> => {
    const { data } = await apiClient.post('/admin/doctors', payload);
    return data;
  },

  getAuditLogs: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await apiClient.get('/admin/audit-logs', { params });
    return data;
  },
};
