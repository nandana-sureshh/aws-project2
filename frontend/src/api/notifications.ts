import apiClient from './client';
import { Notification, PaginatedResponse } from '../types';

export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Notification>> => {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<{ data: { count: number } }> => {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/mark-all-read');
  },
};
