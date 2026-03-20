import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../../api/patients';
import { useNotification } from '../../hooks/useNotification';
import { Modal } from '../common/Modal';
import type { CreatePatientInput } from '../../types';
import type { ApiError } from '../../types';

interface FormState {
  patient_id_number: string;
  full_name: string;
  age: string;
  date_of_admission: string;
}

const today = () => new Date().toISOString().split('T')[0];

const INITIAL: FormState = {
  patient_id_number: '',
  full_name: '',
  age: '',
  date_of_admission: today(),
};

const inputCls = 'w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all';
const inputStyle: React.CSSProperties = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
};
const focusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.border = '1px solid #6366f1';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)';
};
const blurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.border = '1px solid #E2E8F0';
  e.currentTarget.style.boxShadow = 'none';
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPatientModal = ({ isOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL);
      setFieldErrors({});
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.create(input),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['clinician', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Patient record created successfully');
      onClose();
      navigate(`/patients/${patient.id}`);
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) setFieldErrors(apiErr.fields);
      else notify.error(apiErr?.error ?? 'Failed to create patient');
    },
  });

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'patient_id_number' ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.patient_id_number.trim()) errors.patient_id_number = 'Required';
    if (!form.full_name.trim()) errors.full_name = 'Required';
    else if (form.full_name.trim().length < 2) errors.full_name = 'Min. 2 characters';
    const ageNum = parseInt(form.age, 10);
    if (!form.age) errors.age = 'Required';
    else if (isNaN(ageNum) || ageNum < 10 || ageNum > 60) errors.age = 'Must be 10–60';
    if (!form.date_of_admission) errors.date_of_admission = 'Required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      patient_id_number: form.patient_id_number.trim(),
      full_name: form.full_name.trim(),
      age: parseInt(form.age, 10),
      date_of_admission: form.date_of_admission,
    });
  };

  const serverError = (mutation.error as { response?: { data?: ApiError } } | null)?.response?.data;
  const err = (f: string) => fieldErrors[f];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Patient"
      subtitle="Register a new patient record in the system"
      maxWidth="md"
    >
      {/* Server error */}
      {serverError && !serverError.fields && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)', color: '#B91C1C' }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{serverError.error ?? serverError.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Patient ID */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Patient ID Number *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
            </span>
            <input
              type="text"
              className={`${inputCls} font-mono uppercase`}
              style={{ ...inputStyle, ...(err('patient_id_number') ? { border: '1px solid #FCA5A5' } : {}) }}
              placeholder="e.g. MH-2024-0042"
              value={form.patient_id_number}
              onChange={set('patient_id_number')}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>
          {err('patient_id_number')
            ? <p className="text-[10px] text-red-500 mt-0.5">{err('patient_id_number')}</p>
            : <p className="text-[10px] text-gray-400 mt-0.5">Hospital or clinic assigned ID</p>
          }
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input
              type="text"
              className={inputCls}
              style={{ ...inputStyle, ...(err('full_name') ? { border: '1px solid #FCA5A5' } : {}) }}
              placeholder="e.g. Mary Nakato"
              value={form.full_name}
              onChange={set('full_name')}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
          </div>
          {err('full_name') && <p className="text-[10px] text-red-500 mt-0.5">{err('full_name')}</p>}
        </div>

        {/* Age + Date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Age *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="number"
                className={inputCls}
                style={{ ...inputStyle, ...(err('age') ? { border: '1px solid #FCA5A5' } : {}) }}
                placeholder="e.g. 28"
                min={10} max={60}
                value={form.age}
                onChange={set('age')}
                onFocus={focusHandler}
                onBlur={blurHandler}
              />
            </div>
            {err('age') && <p className="text-[10px] text-red-500 mt-0.5">{err('age')}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Admission *</label>
            <input
              type="date"
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all"
              style={{ ...inputStyle, ...(err('date_of_admission') ? { border: '1px solid #FCA5A5' } : {}) }}
              max={today()}
              value={form.date_of_admission}
              onChange={set('date_of_admission')}
              onFocus={focusHandler}
              onBlur={blurHandler}
            />
            {err('date_of_admission') && <p className="text-[10px] text-red-500 mt-0.5">{err('date_of_admission')}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            style={{ border: '1px solid #E2E8F0' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)', boxShadow: '0 4px 12px rgba(67,56,202,0.30)' }}
          >
            {mutation.isPending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : 'Save Patient Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
