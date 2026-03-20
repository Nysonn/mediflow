import apiClient from './axios';
import type { User } from '../types';

export const authApi = {
  getMe: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  completePasswordReset: async (): Promise<void> => {
    await apiClient.post('/auth/complete-password-reset');
  },
};
