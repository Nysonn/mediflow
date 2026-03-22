import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../../api/patients';
import { formatMinutesToHours } from '../../utils/formatters';
import type { ApiError } from '../../types';

interface AssessmentFormProps {
  patientId: string;
}

interface FormState {
  duration_labour_min: string;
  hiv_status_num: string;
  parity_num: string;
  booked_unbooked: string;
  delivery_method_clean_lscs: string;
}

const EMPTY: FormState = {
  duration_labour_min: '',
  hiv_status_num: '',
  parity_num: '',
  booked_unbooked: '',
  delivery_method_clean_lscs: '',
};

export const AssessmentForm = ({ patientId }: AssessmentFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: (input: {
      duration_labour_min: number;
      hiv_status_num: number;
      parity_num: number;
      booked_unbooked: number;
      delivery_method_clean_lscs: number;
    }) => patientsApi.update(patientId, input),
    onSuccess: ({ assessment }) => {
      queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      navigate(`/patients/${patientId}/assessments/${assessment.id}/result`);
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number; data?: ApiError } })?.response?.status;
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (status === 503 || apiErr?.error?.toLowerCase().includes('model') || apiErr?.error?.toLowerCase().includes('prediction')) {
        setServerError('The prediction service is currently unavailable. Please try again in a moment.');
      } else {
        setServerError(apiErr?.error ?? apiErr?.message ?? 'An unexpected error occurred. Please try again.');
      }
    },
  });

  const setField = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
    setServerError(undefined);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const dur = parseInt(form.duration_labour_min, 10);
    if (!form.duration_labour_min) errors.duration_labour_min = 'Duration of labour is required';
    else if (isNaN(dur) || dur < 1 || dur > 9999)
      errors.duration_labour_min = 'Duration must be between 1 and 9999 minutes';
    if (form.hiv_status_num === '') errors.hiv_status_num = 'HIV status is required';
    const parity = parseInt(form.parity_num, 10);
    if (form.parity_num === '') errors.parity_num = 'Parity is required';
    else if (isNaN(parity) || parity < 0 || parity > 20)
      errors.parity_num = 'Parity must be between 0 and 20';
    if (form.booked_unbooked === '') errors.booked_unbooked = 'Booking status is required';
    if (form.delivery_method_clean_lscs === '') errors.delivery_method_clean_lscs = 'Delivery method is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(undefined);
    if (!validate()) return;
    mutation.mutate({
      duration_labour_min: parseInt(form.duration_labour_min, 10),
      hiv_status_num: parseInt(form.hiv_status_num, 10),
      parity_num: parseInt(form.parity_num, 10),
      booked_unbooked: parseInt(form.booked_unbooked, 10),
      delivery_method_clean_lscs: parseInt(form.delivery_method_clean_lscs, 10),
    });
  };

  const durMin = parseInt(form.duration_labour_min, 10);
  const durDisplay = !isNaN(durMin) && durMin > 0 ? formatMinutesToHours(durMin) : null;

  const isUntouched =
    form.duration_labour_min === '' &&
    form.hiv_status_num === '' &&
    form.parity_num === '' &&
    form.booked_unbooked === '' &&
    form.delivery_method_clean_lscs === '';

  const err = (f: string) => fieldErrors[f];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* Field 1 — Duration of Labour */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Duration of Labour (minutes) *</span>
          {durDisplay && (
            <span className="label-text-alt text-primary font-semibold">= {durDisplay}</span>
          )}
        </label>
        <input
          type="number"
          className={`input input-bordered ${err('duration_labour_min') ? 'input-error' : ''}`}
          placeholder="e.g. 180"
          min={1}
          max={9999}
          value={form.duration_labour_min}
          onChange={setField('duration_labour_min')}
        />
        <label className="label">
          {err('duration_labour_min') ? (
            <span className="label-text-alt text-error">{err('duration_labour_min')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Enter total duration in minutes. e.g. 180 = 3 hours
            </span>
          )}
        </label>
      </div>

      {/* Field 2 — HIV Status */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">HIV Status *</span>
        </label>
        <select
          className={`select select-bordered ${err('hiv_status_num') ? 'select-error' : ''}`}
          value={form.hiv_status_num}
          onChange={setField('hiv_status_num')}
        >
          <option value="" disabled>Select…</option>
          <option value="0">Negative (0)</option>
          <option value="1">Positive (1)</option>
        </select>
        <label className="label">
          {err('hiv_status_num') ? (
            <span className="label-text-alt text-error">{err('hiv_status_num')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Patient HIV status at time of delivery
            </span>
          )}
        </label>
      </div>

      {/* Field 3 — Parity */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Parity (Previous Live Births) *</span>
        </label>
        <input
          type="number"
          className={`input input-bordered w-32 ${err('parity_num') ? 'input-error' : ''}`}
          placeholder="e.g. 0"
          min={0}
          max={20}
          value={form.parity_num}
          onChange={setField('parity_num')}
        />
        <label className="label">
          {err('parity_num') ? (
            <span className="label-text-alt text-error">{err('parity_num')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Enter 0 for first-time mothers (nulliparous)
            </span>
          )}
        </label>
      </div>

      {/* Field 4 — Booking Status */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Booking Status *</span>
        </label>
        <select
          className={`select select-bordered ${err('booked_unbooked') ? 'select-error' : ''}`}
          value={form.booked_unbooked}
          onChange={setField('booked_unbooked')}
        >
          <option value="" disabled>Select…</option>
          <option value="0">Booked (0)</option>
          <option value="1">Unbooked (1)</option>
        </select>
        <label className="label">
          {err('booked_unbooked') ? (
            <span className="label-text-alt text-error">{err('booked_unbooked')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Was the mother registered for antenatal care at this facility?
            </span>
          )}
        </label>
      </div>

      {/* Field 5 — Delivery Method */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Delivery Method *</span>
        </label>
        <select
          className={`select select-bordered ${err('delivery_method_clean_lscs') ? 'select-error' : ''}`}
          value={form.delivery_method_clean_lscs}
          onChange={setField('delivery_method_clean_lscs')}
        >
          <option value="" disabled>Select…</option>
          <option value="0">Normal / Vaginal (0)</option>
          <option value="1">LSCS / Caesarean Section (1)</option>
        </select>
        <label className="label">
          {err('delivery_method_clean_lscs') ? (
            <span className="label-text-alt text-error">{err('delivery_method_clean_lscs')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Lower Segment Caesarean Section or normal vaginal delivery
            </span>
          )}
        </label>
      </div>

      {/* Info alert */}
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          The risk prediction will be generated immediately upon submission using the MediFlow PPH prediction model.
        </span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={mutation.isPending || isUntouched}
      >
        {mutation.isPending ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Running prediction…
          </>
        ) : (
          'Run Risk Assessment'
        )}
      </button>
    </form>
  );
};
