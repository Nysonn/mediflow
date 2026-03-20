import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { adminApi } from '../../api/admin';
import { useNotification } from '../../hooks/useNotification';
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

const glassCard = {
  background: 'rgba(255,255,255,0.50)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.10), 0 1px 4px rgba(0,0,0,0.04)',
};

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.7)',
};

const inputErrorStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid #FCA5A5',
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

export const RegisterUserPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const notify = useNotification();

  useEffect(() => {
    dispatch(setPageTitle('Register Clinician'));
  }, [dispatch]);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: CreateUserInput) => adminApi.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Clinician registered successfully');
      navigate('/admin/users');
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) {
        setFieldErrors(apiErr.fields);
      }
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email address';
    if (!form.role) errors.role = 'Role is required';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
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

  const field = (name: keyof FormState) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [name]: e.target.value }));
      setFieldErrors((fe) => ({ ...fe, [name]: '' }));
    },
  });

  const serverError = (mutation.error as { response?: { data?: ApiError } } | null)?.response?.data;
  const pwStrength = passwordStrength(form.password);

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div>
        <button
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
          onClick={() => navigate('/admin/users')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clinicians
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Register New Clinician</h1>
        <p className="text-sm text-gray-400 mt-0.5">Create an account for a new clinical staff member</p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl p-6 sm:p-8" style={glassCard}>
        {serverError && !serverError.fields && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm text-red-600"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            {serverError.error || serverError.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30"
                style={fieldErrors.full_name ? inputErrorStyle : inputBase}
                placeholder="Dr. Jane Smith"
                {...field('full_name')}
              />
            </div>
            {fieldErrors.full_name && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30"
                style={fieldErrors.email ? inputErrorStyle : inputBase}
                placeholder="jane.smith@hospital.org"
                {...field('email')}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              <input
                type="tel"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30"
                style={inputBase}
                placeholder="+265 999 000 000"
                {...field('phone_number')}
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6a4 4 0 11-8 0 4 4 0 018 0zM12 15v6" />
                </svg>
              </span>
              <select
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30 appearance-none cursor-pointer"
                style={fieldErrors.role ? inputErrorStyle : inputBase}
                {...field('role')}
              >
                <option value="">Select a role</option>
                <option value="doctor">Doctor</option>
                <option value="midwife">Midwife</option>
                <option value="nurse">Nurse</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            {fieldErrors.role && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.role}</p>
            )}
          </div>

          {/* Temporary Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30"
                style={fieldErrors.password ? inputErrorStyle : inputBase}
                placeholder="Min. 8 characters"
                {...field('password')}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
            )}
            {pwStrength && !fieldErrors.password && (
              <div className="mt-2">
                <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: pwStrength.width, background: pwStrength.color }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: pwStrength.color }}>
                  {pwStrength.label} password
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-indigo-400/30"
                style={fieldErrors.confirm_password ? inputErrorStyle : inputBase}
                placeholder="Repeat password"
                {...field('confirm_password')}
              />
            </div>
            {fieldErrors.confirm_password && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm_password}</p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Registering…
                </>
              ) : (
                'Register Clinician'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
