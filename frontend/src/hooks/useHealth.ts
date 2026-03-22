import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health';
import type { HealthStatus } from '../types';

export const useHealth = () => {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: healthApi.get,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: 60_000,
  });
};
