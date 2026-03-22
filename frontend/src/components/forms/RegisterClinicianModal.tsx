import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { useNotification } from '../../hooks/useNotification';
import { Modal } from '../common/Modal';
import type { CreateUserInput, Role } from '../../types';
import type { ApiError } from '../../types';

interface FormState {
  full_name: string;
  email: string;
  phone_number: string;
  role: Role | '';
  password: string;
  confirm_password: string;
}

const INITIAL: FormState = {
  full_name: '',
  email: '',
  phone_number: '',
  role: '',
  password: '',
  confirm_password: '',
};

const passwordStrength = (pw: string) => {
  if (!pw) return null;
  if (pw.length < 8) return { label: 'Weak', color: '#DC2626', width: '33%' };
  const hasMixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSym = /[^a-zA-Z0-9]/.test(pw);
  if (hasMixed && hasNum && hasSym) return { label: 'Strong', color: '#059669', width: '100%' };
  if ((hasMixed || hasNum) && (hasNum || hasSym)) return { label: 'Medium', color: '#D97706', width: '66%' };
  return { label: 'Weak', color: '#DC2626', width: '33%' };
};

const inputCls = 'w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all';
const inputStyle: React.CSSProperties = {
  background: '#F4F6F8',
  border: '1px solid #DDE3EA',
};
const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.border = '1px solid #4A6D8C';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,109,140,0.15)';
};
const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.border = '1px solid #DDE3EA';
  e.currentTarget.style.boxShadow = 'none';
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterClinicianModal = ({ isOpen, onClose }: Props) => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Clinician registered successfully');
      setForm(INITIAL);
      setFieldErrors({});
      onClose();
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) setFieldErrors(apiErr.fields);
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = 'Required';
    if (!form.email.trim()) errors.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email';
    if (!form.role) errors.role = 'Required';
    if (!form.password) errors.password = 'Required';
    else if (form.password.length < 8) errors.password = 'Min. 8 characters';
    if (form.password !== form.confirm_password) errors.confirm_password = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone_number: form.phone_number.trim(),
      role: form.role as Role,
      password: form.password,
    });
  };

  const set = (name: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [name]: '' }));
  };

  const pwStrength = passwordStrength(form.password);
  const serverError = (mutation.error as { response?: { data?: ApiError } } | null)?.response?.data;

  const handleClose = () => {
    setForm(INITIAL);
    setFieldErrors({});
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register New Clinician"
      subtitle="Create an account for a new clinical staff member"
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
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <input type="text" className={inputCls} style={{ ...inputStyle, ...(fieldErrors.full_name ? { border: '1px solid #C0392B' } : {}) }}
              placeholder="Dr. Jane Smith" value={form.full_name} onChange={set('full_name')}
              onFocus={focusHandler} onBlur={blurHandler} />
          </div>
          {fieldErrors.full_name && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.full_name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input type="email" className={inputCls} style={{ ...inputStyle, ...(fieldErrors.email ? { border: '1px solid #C0392B' } : {}) }}
              placeholder="jane.smith@hospital.org" value={form.email} onChange={set('email')}
              onFocus={focusHandler} onBlur={blurHandler} />
          </div>
          {fieldErrors.email && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.email}</p>}
        </div>

        {/* Phone + Role row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              <input type="tel" className={inputCls} style={inputStyle}
                placeholder="+256 700 000 000" value={form.phone_number} onChange={set('phone_number')}
                onFocus={focusHandler} onBlur={blurHandler} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all appearance-none"
              style={{ ...inputStyle, ...(fieldErrors.role ? { border: '1px solid #C0392B' } : {}) }}
              value={form.role} onChange={set('role')}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              <option value="">Select role</option>
              <option value="doctor">Doctor</option>
              <option value="midwife">Midwife</option>
              <option value="nurse">Nurse</option>
            </select>
            {fieldErrors.role && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.role}</p>}
          </div>
        </div>

        {/* Password + Confirm row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Temporary Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input type="password" className={inputCls} style={{ ...inputStyle, ...(fieldErrors.password ? { border: '1px solid #C0392B' } : {}) }}
                placeholder="Min. 8 characters" value={form.password} onChange={set('password')}
                onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            {fieldErrors.password
              ? <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.password}</p>
              : pwStrength && (
                <div className="mt-1">
                  <div className="w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width: pwStrength.width, backgroundColor: pwStrength.color }} />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                </div>
              )
            }
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <input type="password" className={inputCls} style={{ ...inputStyle, ...(fieldErrors.confirm_password ? { border: '1px solid #C0392B' } : {}) }}
                placeholder="Repeat password" value={form.confirm_password} onChange={set('confirm_password')}
                onFocus={focusHandler} onBlur={blurHandler} />
            </div>
            {fieldErrors.confirm_password && <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.confirm_password}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            style={{ border: '1px solid #DDE3EA' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#4A6D8C', boxShadow: '0 4px 12px rgba(74,109,140,0.30)' }}
          >
            {mutation.isPending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : 'Register Clinician'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
