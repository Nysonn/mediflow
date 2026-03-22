import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';
import { useNotification } from './useNotification';
import type { CreateUserInput } from '../types';

export const useUsers = (role?: string) => {
  return useQuery({
    queryKey: ['admin', 'users', role ?? 'all'],
    queryFn: () => adminApi.getUsers(role),
    staleTime: 5 * 60_000,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Clinician registered successfully');
    },
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('User deactivated successfully');
    },
  });
};
