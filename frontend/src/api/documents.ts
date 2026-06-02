import apiClient from './client';
import { Document, PaginatedResponse } from '../types';

export const documentsApi = {
  upload: async (
    file: File,
    appointmentId?: string,
    medicalRecordId?: string
  ): Promise<{ data: Document }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (appointmentId) formData.append('appointmentId', appointmentId);
    if (medicalRecordId) formData.append('medicalRecordId', medicalRecordId);

    const { data } = await apiClient.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getMyDocuments: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Document>> => {
    const { data } = await apiClient.get('/documents', { params });
    return data;
  },

  download: async (id: string, originalName: string): Promise<void> => {
    const response = await apiClient.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    link.click();
    URL.revokeObjectURL(url);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },
};
