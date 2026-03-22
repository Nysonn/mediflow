import apiClient from './axios';
import type {
  Patient,
  Assessment,
  PaginatedPatients,
  CreatePatientInput,
  CreatePatientWithAssessmentInput,
} from '../types';

export const patientsApi = {
  getAll: async (params: {
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedPatients> => {
    const { data } = await apiClient.get('/patients', { params });
    return data;
  },

  getById: async (id: string): Promise<{
    patient: Patient;
    assessments: Assessment[];
    latest_risk: string;
  }> => {
    const { data } = await apiClient.get(`/patients/${id}`);
    return data;
  },

  create: async (input: CreatePatientInput): Promise<Patient> => {
    const { data } = await apiClient.post('/patients', input);
    return data;
  },

  update: async (id: string, input: Partial<CreatePatientInput>): Promise<Patient> => {
    const { data } = await apiClient.put(`/patients/${id}`, input);
    return data;
  },

  createWithAssessment: async (
    input: CreatePatientWithAssessmentInput,
  ): Promise<{ patient: Patient; assessment: Assessment }> => {
    const { data } = await apiClient.post('/patients/with-assessment', input);
    return data;
  },
};
