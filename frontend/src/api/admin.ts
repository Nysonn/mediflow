import apiClient from './axios';
import type { User, DashboardStats, CreateUserInput } from '../types';

export const adminApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get('/admin/dashboard');
    return data;
  },

  getUsers: async (role?: string): Promise<{ users: User[]; total: number }> => {
    const params = role ? { role } : {};
    const { data } = await apiClient.get('/admin/users', { params });
    return data;
  },

  createUser: async (input: CreateUserInput): Promise<{ message: string; user: User }> => {
    const { data } = await apiClient.post('/admin/users', input);
    return data;
  },

  deactivateUser: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/deactivate`);
  },
};
