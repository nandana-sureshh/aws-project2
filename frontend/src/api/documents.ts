import apiClient from './client';
import { Document, PaginatedResponse } from '../types';

export const documentsApi = {
  upload: async (
    file: File,
    appointmentId?: string,
    medicalRecordId?: string
  ): Promise<{ data: Document }> => {
    // 1. Get presigned URL
    const { data: presignData } = await apiClient.post('/documents/presigned-url', {
      originalName: file.name,
      mimeType: file.type,
    });

    const { url, key, filename } = presignData.data;

    // 2. Upload directly to S3
    const uploadRes = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${file.name}"`
      },
    });

    if (!uploadRes.ok) {
      throw new Error(`S3 upload failed: ${uploadRes.statusText}`);
    }

    // 3. Confirm upload with backend
    const { data } = await apiClient.post('/documents/confirm-upload', {
      key,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      appointmentId,
      medicalRecordId,
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
