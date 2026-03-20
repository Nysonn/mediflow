export type Role = 'admin' | 'doctor' | 'midwife' | 'nurse';

export interface User {
  id: string;
  clerk_user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: Role;
  is_active: boolean;
  password_reset_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  patient_id_number: string;
  full_name: string;
  age: number;
  date_of_admission: string;
  added_by_user_id: string;
  added_by_name: string;
  latest_risk: 'HIGH' | 'LOW' | '';
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  patient_id: string;
  assessed_by_user_id: string;
  assessed_by_name: string;
  duration_labour_min: number;
  hiv_status_num: number;
  parity_num: number;
  booked_unbooked: number;
  delivery_method_clean_lscs: number;
  prediction: number;
  probability_no_pph: number;
  probability_severe_pph: number;
  risk_level: 'HIGH' | 'LOW';
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_doctors: number;
  total_midwives: number;
  total_nurses: number;
  total_patients: number;
  total_assessments: number;
  high_risk_count: number;
  low_risk_count: number;
  recent_patients: Patient[];
}

export interface ClinicianStats {
  my_patients: number;
  my_assessments: number;
  my_high_risk: number;
  my_low_risk: number;
  recent_patients: Patient[];
}

export interface PaginatedPatients {
  patients: Patient[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  message: string;
  fields?: Record<string, string>;
}

export interface CreateUserInput {
  full_name: string;
  email: string;
  phone_number: string;
  role: Role;
  password: string;
}

export interface CreatePatientInput {
  patient_id_number: string;
  full_name: string;
  age: number;
  date_of_admission: string;
}

export interface CreateAssessmentInput {
  duration_labour_min: number;
  hiv_status_num: number;
  parity_num: number;
  booked_unbooked: number;
  delivery_method_clean_lscs: number;
}
