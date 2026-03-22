import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { assessmentsApi } from '../api/assessments';
import type { DashboardStats, ClinicianStats } from '../types';

export const useAdminDashboard = () => {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
    staleTime: 5 * 60_000,
  });
};

export const useClinicianDashboard = (enabled = true) => {
  return useQuery<ClinicianStats>({
    queryKey: ['clinician', 'dashboard'],
    queryFn: assessmentsApi.getDashboard,
    enabled,
    staleTime: 5 * 60_000,
  });
};
