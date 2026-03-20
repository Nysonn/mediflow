import apiClient from './axios';
import type { Assessment, CreateAssessmentInput, ClinicianStats } from '../types';

export const assessmentsApi = {
  create: async (
    patientId: string,
    input: CreateAssessmentInput
  ): Promise<{ assessment: Assessment }> => {
    const { data } = await apiClient.post(
      `/patients/${patientId}/assessments`,
      input
    );
    return data;
  },

  getByPatient: async (patientId: string): Promise<{
    assessments: Assessment[];
    total: number;
  }> => {
    const { data } = await apiClient.get(`/patients/${patientId}/assessments`);
    return data;
  },

  getById: async (patientId: string, assessmentId: string): Promise<Assessment> => {
    const { data } = await apiClient.get(
      `/patients/${patientId}/assessments/${assessmentId}`
    );
    return data;
  },

  getDashboard: async (): Promise<ClinicianStats> => {
    const { data } = await apiClient.get('/dashboard');
    return data;
  },
};
