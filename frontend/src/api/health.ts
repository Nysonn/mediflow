import axios from 'axios';
import type { HealthStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export const healthApi = {
  get: async (): Promise<HealthStatus> => {
    const { data } = await axios.get(`${API_BASE_URL}/health`);
    return data;
  },
};
