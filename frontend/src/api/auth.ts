import apiClient from './client';
import { User } from '../types';

interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'DOCTOR' | 'PATIENT';
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getMe: async (): Promise<{ data: User }> => {
    const { data } = await apiClient.get<{ data: User }>('/auth/me');
    return data;
  },
};
