import apiClient from './axios';
import type { ClinicianStats } from '../types';

export const assessmentsApi = {
  getDashboard: async (): Promise<ClinicianStats> => {
    const { data } = await apiClient.get('/dashboard');
    return data;
  },
};
