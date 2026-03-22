import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentsApi } from '../../api/assessments';
import { useNotification } from '../../hooks/useNotification';
import { Modal } from '../common/Modal';
import { formatMinutesToHours } from '../../utils/formatters';
import type { Assessment, CreateAssessmentInput, ApiError } from '../../types';

interface Props {
  patientId: string;
  assessment: Assessment | null;
  onClose: () => void;
}

interface FormState {
  duration_labour_min: string;
  hiv_status_num: string;
  parity_num: string;
  booked_unbooked: string;
  delivery_method_clean_lscs: string;
}

const inputStyle: React.CSSProperties = { background: '#F4F6F8', border: '1px solid #DDE3EA' };
const selectCls = 'w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all appearance-none';

const focusHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.border = '1px solid #6B8CAE';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,140,174,0.15)';
};
const blurHandler = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.border = '1px solid #DDE3EA';
  e.currentTarget.style.boxShadow = 'none';
};
const errStyle = (hasError: boolean): React.CSSProperties =>
  hasError ? { border: '1px solid #C0392B' } : {};

const toForm = (a: Assessment): FormState => ({
  duration_labour_min: String(Math.round(a.duration_labour_min)),
  hiv_status_num: String(a.hiv_status_num),
  parity_num: String(a.parity_num),
  booked_unbooked: String(a.booked_unbooked),
  delivery_method_clean_lscs: String(a.delivery_method_clean_lscs),
});

export const EditAssessmentModal = ({ patientId, assessment, onClose }: Props) => {
  const queryClient = useQueryClient();
  const notify = useNotification();

  const [form, setForm] = useState<FormState>(
    assessment ? toForm(assessment) : {
      duration_labour_min: '', hiv_status_num: '', parity_num: '',
      booked_unbooked: '', delivery_method_clean_lscs: '',
    }
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | undefined>();

  // Re-populate form whenever a different assessment is opened.
  useEffect(() => {
    if (assessment) {
      setForm(toForm(assessment));
      setFieldErrors({});
      setServerError(undefined);
    }
  }, [assessment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (input: CreateAssessmentInput) =>
      assessmentsApi.update(patientId, assessment!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      queryClient.invalidateQueries({ queryKey: ['clinician', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Assessment updated successfully');
      onClose();
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) {
        setFieldErrors(apiErr.fields);
      } else if (status === 503 || apiErr?.error === 'model_unavailable') {
        setServerError('The prediction service is currently unavailable. Please try again.');
      } else {
        setServerError(apiErr?.message ?? 'An unexpected error occurred.');
      }
    },
  });

  const setF = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setFieldErrors((fe) => ({ ...fe, [field]: '' }));
      setServerError(undefined);
    };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const dur = parseInt(form.duration_labour_min, 10);
    if (!form.duration_labour_min) errors.duration_labour_min = 'Required';
    else if (isNaN(dur) || dur < 1 || dur > 9999) errors.duration_labour_min = 'Must be 1–9999 minutes';
    if (form.hiv_status_num === '') errors.hiv_status_num = 'Required';
    const parity = parseInt(form.parity_num, 10);
    if (form.parity_num === '') errors.parity_num = 'Required';
    else if (isNaN(parity) || parity < 0 || parity > 20) errors.parity_num = 'Must be 0–20';
    if (form.booked_unbooked === '') errors.booked_unbooked = 'Required';
    if (form.delivery_method_clean_lscs === '') errors.delivery_method_clean_lscs = 'Required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      duration_labour_min: parseInt(form.duration_labour_min, 10),
      hiv_status_num: parseInt(form.hiv_status_num, 10),
      parity_num: parseInt(form.parity_num, 10),
      booked_unbooked: parseInt(form.booked_unbooked, 10),
      delivery_method_clean_lscs: parseInt(form.delivery_method_clean_lscs, 10),
    });
  };

  const ae = (f: string) => fieldErrors[f];
  const durMin = parseInt(form.duration_labour_min, 10);
  const durDisplay = !isNaN(durMin) && durMin > 0 ? formatMinutesToHours(durMin) : null;

  return (
    <Modal
      isOpen={!!assessment}
      onClose={onClose}
      title="Edit Assessment"
      subtitle="Inputs are re-submitted to the model — the prediction will be recalculated"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Server error */}
        {serverError && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)', color: '#B91C1C' }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        {/* Duration */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-600">Duration of Labour (minutes) *</label>
            {durDisplay && (
              <span className="text-[10px] font-semibold" style={{ color: '#6B8CAE' }}>= {durDisplay}</span>
            )}
          </div>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all"
            style={{ ...inputStyle, ...errStyle(!!ae('duration_labour_min')) }}
            placeholder="e.g. 180"
            min={1} max={9999}
            value={form.duration_labour_min}
            onChange={setF('duration_labour_min')}
            onFocus={focusHandler} onBlur={blurHandler}
          />
          {ae('duration_labour_min')
            ? <p className="text-[10px] text-red-500 mt-0.5">{ae('duration_labour_min')}</p>
            : <p className="text-[10px] text-gray-400 mt-0.5">Enter total duration in minutes, e.g. 180 = 3 hours</p>
          }
        </div>

        {/* HIV Status + Parity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">HIV Status *</label>
            <select
              className={selectCls}
              style={{ ...inputStyle, ...errStyle(!!ae('hiv_status_num')) }}
              value={form.hiv_status_num}
              onChange={setF('hiv_status_num')}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              <option value="">Select…</option>
              <option value="0">Negative</option>
              <option value="1">Positive</option>
            </select>
            {ae('hiv_status_num') && <p className="text-[10px] text-red-500 mt-0.5">{ae('hiv_status_num')}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Parity (Previous Live Births) *</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all"
              style={{ ...inputStyle, ...errStyle(!!ae('parity_num')) }}
              placeholder="e.g. 0"
              min={0} max={20}
              value={form.parity_num}
              onChange={setF('parity_num')}
              onFocus={focusHandler} onBlur={blurHandler}
            />
            {ae('parity_num')
              ? <p className="text-[10px] text-red-500 mt-0.5">{ae('parity_num')}</p>
              : <p className="text-[10px] text-gray-400 mt-0.5">0 = first-time mother</p>
            }
          </div>
        </div>

        {/* Booking Status + Delivery Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Booking Status *</label>
            <select
              className={selectCls}
              style={{ ...inputStyle, ...errStyle(!!ae('booked_unbooked')) }}
              value={form.booked_unbooked}
              onChange={setF('booked_unbooked')}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              <option value="">Select…</option>
              <option value="0">Booked</option>
              <option value="1">Unbooked</option>
            </select>
            {ae('booked_unbooked') && <p className="text-[10px] text-red-500 mt-0.5">{ae('booked_unbooked')}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Method *</label>
            <select
              className={selectCls}
              style={{ ...inputStyle, ...errStyle(!!ae('delivery_method_clean_lscs')) }}
              value={form.delivery_method_clean_lscs}
              onChange={setF('delivery_method_clean_lscs')}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              <option value="">Select…</option>
              <option value="0">Vaginal</option>
              <option value="1">LSCS / Caesarean</option>
            </select>
            {ae('delivery_method_clean_lscs') && <p className="text-[10px] text-red-500 mt-0.5">{ae('delivery_method_clean_lscs')}</p>}
          </div>
        </div>

        {/* Warning */}
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
          style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.25)', color: '#92400E' }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>Saving will re-run the prediction model and overwrite the current risk result for this assessment.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
            style={{ border: '1px solid #DDE3EA' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#6B8CAE', boxShadow: '0 4px 12px rgba(107,140,174,0.30)' }}
          >
            {mutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Re-running prediction…
              </>
            ) : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
