import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health';
import type { HealthStatus } from '../types';

export const useHealth = () => {
  return useQuery<HealthStatus>({
    queryKey: ['health'],
    queryFn: healthApi.get,
    staleTime: 2 * 60_000,
    retry: 1,
    refetchInterval: 2 * 60_000,
  });
};
