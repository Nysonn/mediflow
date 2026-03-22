import axios from 'axios';
import type { HealthStatus } from '../types';

export const healthApi = {
  get: async (): Promise<HealthStatus> => {
    const { data } = await axios.get('/health');
    return data;
  },
};
