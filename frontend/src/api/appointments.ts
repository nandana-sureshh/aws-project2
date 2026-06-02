import apiClient from './client';
import { Appointment, PaginatedResponse } from '../types';

export const appointmentsApi = {
  create: async (payload: {
    doctorId: string;
    scheduledAt: string;
    reason: string;
    duration?: number;
  }): Promise<{ data: Appointment }> => {
    const { data } = await apiClient.post('/appointments', payload);
    return data;
  },

  getById: async (id: string): Promise<{ data: Appointment }> => {
    const { data } = await apiClient.get(`/appointments/${id}`);
    return data;
  },

  getAll: async (params?: { page?: number; limit?: number; status?: string }): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await apiClient.get('/appointments', { params });
    return data;
  },

  update: async (id: string, payload: { status?: string; notes?: string; scheduledAt?: string }): Promise<{ data: Appointment }> => {
    const { data } = await apiClient.patch(`/appointments/${id}`, payload);
    return data;
  },
};
