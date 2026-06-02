import apiClient from './client';
import { MedicalRecord, PaginatedResponse } from '../types';

export const recordsApi = {
  create: async (payload: {
    appointmentId: string;
    diagnosis?: string;
    notes?: string;
    treatment?: string;
    prescription?: string;
    followUpDate?: string;
  }): Promise<{ data: MedicalRecord }> => {
    const { data } = await apiClient.post('/records', payload);
    return data;
  },

  update: async (id: string, payload: Partial<MedicalRecord>): Promise<{ data: MedicalRecord }> => {
    const { data } = await apiClient.patch(`/records/${id}`, payload);
    return data;
  },

  getById: async (id: string): Promise<{ data: MedicalRecord }> => {
    const { data } = await apiClient.get(`/records/${id}`);
    return data;
  },

  getMyRecords: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<MedicalRecord>> => {
    const { data } = await apiClient.get('/records/my', { params });
    return data;
  },
};
