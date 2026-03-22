import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../api/patients';
import { useNotification } from './useNotification';
import type { CreatePatientWithAssessmentInput, UpdatePatientWithAssessmentInput } from '../types';

export const usePatients = (params: {
  search?: string;
  page?: number;
  page_size?: number;
} = {}) => {
  return useQuery({
    queryKey: ['patients', 'list', params],
    queryFn: () => patientsApi.getAll(params),
    staleTime: 5 * 60_000,
  });
};

export const usePatient = (id: string | undefined) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (input: CreatePatientWithAssessmentInput) =>
      patientsApi.createWithAssessment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['clinician', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Patient and assessment created successfully');
    },
  });
};

export const useUpdatePatient = (patientId: string) => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  return useMutation({
    mutationFn: (input: UpdatePatientWithAssessmentInput) =>
      patientsApi.update(patientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['clinician', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Assessment updated successfully');
    },
  });
};
