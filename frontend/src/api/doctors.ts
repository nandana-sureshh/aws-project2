import apiClient from './client';
import { DoctorProfile, Appointment, PaginatedResponse } from '../types';

export const doctorsApi = {
  getProfile: async (): Promise<{ data: DoctorProfile }> => {
    const { data } = await apiClient.get('/doctors/profile');
    return data;
  },

  updateProfile: async (payload: Partial<DoctorProfile>): Promise<{ data: DoctorProfile }> => {
    const { data } = await apiClient.put('/doctors/profile', payload);
    return data;
  },

  getAppointments: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await apiClient.get('/doctors/appointments', { params });
    return data;
  },

  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<DoctorProfile>> => {
    const { data } = await apiClient.get('/doctors', { params });
    return data;
  },

  getById: async (id: string): Promise<{ data: DoctorProfile }> => {
    const { data } = await apiClient.get(`/doctors/${id}`);
    return data;
  },
};
