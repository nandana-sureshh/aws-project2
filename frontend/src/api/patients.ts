import apiClient from './client';
import { PatientProfile, Appointment, PaginatedResponse } from '../types';

export const patientsApi = {
  getProfile: async (): Promise<{ data: PatientProfile }> => {
    const { data } = await apiClient.get('/patients/profile');
    return data;
  },

  updateProfile: async (payload: Partial<PatientProfile>): Promise<{ data: PatientProfile }> => {
    const { data } = await apiClient.put('/patients/profile', payload);
    return data;
  },

  getAppointments: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Appointment>> => {
    const { data } = await apiClient.get('/patients/appointments', { params });
    return data;
  },

  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<PatientProfile>> => {
    const { data } = await apiClient.get('/patients', { params });
    return data;
  },

  getById: async (id: string): Promise<{ data: PatientProfile }> => {
    const { data } = await apiClient.get(`/patients/${id}`);
    return data;
  },
};
