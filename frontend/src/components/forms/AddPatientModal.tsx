import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../../api/patients';
import { useNotification } from '../../hooks/useNotification';
import { Modal } from '../common/Modal';
import { formatMinutesToHours } from '../../utils/formatters';
import type { CreatePatientWithAssessmentInput, ApiError } from '../../types';

const today = () => new Date().toISOString().split('T')[0];

interface PatientForm {
  patient_id_number: string;
  full_name: string;
  age: string;
  date_of_admission: string;
}

interface AssessmentForm {
  duration_labour_min: string;
  hiv_status_num: string;
  parity_num: string;
  booked_unbooked: string;
  delivery_method_clean_lscs: string;
}

const INITIAL_PATIENT: PatientForm = {
  patient_id_number: '',
  full_name: '',
  age: '',
  date_of_admission: today(),
};

const INITIAL_ASSESSMENT: AssessmentForm = {
  duration_labour_min: '',
  hiv_status_num: '',
  parity_num: '',
  booked_unbooked: '',
  delivery_method_clean_lscs: '',
};

const inputCls = 'w-full pl-9 pr-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all';
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPatientModal = ({ isOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotification();

  const [step, setStep] = useState<1 | 2>(1);
  const [patient, setPatient] = useState<PatientForm>(INITIAL_PATIENT);
  const [assessment, setAssessment] = useState<AssessmentForm>(INITIAL_ASSESSMENT);
  const [patientErrors, setPatientErrors] = useState<Record<string, string>>({});
  const [assessmentErrors, setAssessmentErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPatient(INITIAL_PATIENT);
      setAssessment(INITIAL_ASSESSMENT);
      setPatientErrors({});
      setAssessmentErrors({});
      mutation.reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: (input: CreatePatientWithAssessmentInput) =>
      patientsApi.createWithAssessment(input),
    onSuccess: ({ patient: p, assessment: a }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['clinician', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      notify.success('Patient registered and assessment complete');
      onClose();
      navigate(`/patients/${p.id}/assessments/${a.id}/result`);
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) {
        // Distribute field errors back to the right step
        const pFields: Record<string, string> = {};
        const aFields: Record<string, string> = {};
        Object.entries(apiErr.fields).forEach(([k, v]) => {
          if (['patient_id_number', 'full_name', 'age', 'date_of_admission'].includes(k)) {
            pFields[k] = v;
          } else {
            aFields[k] = v;
          }
        });
        if (Object.keys(pFields).length) { setPatientErrors(pFields); setStep(1); }
        else setAssessmentErrors(aFields);
      } else if (status === 503 || apiErr?.error === 'model_unavailable') {
        setAssessmentErrors({ _server: 'The prediction service is currently unavailable. Please try again.' });
      } else {
        setAssessmentErrors({ _server: apiErr?.message ?? 'An unexpected error occurred.' });
      }
    },
  });

  const setP = (field: keyof PatientForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'patient_id_number' ? e.target.value.toUpperCase() : e.target.value;
      setPatient((f) => ({ ...f, [field]: value }));
      setPatientErrors((fe) => ({ ...fe, [field]: '' }));
    };

  const setA = (field: keyof AssessmentForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setAssessment((f) => ({ ...f, [field]: e.target.value }));
      setAssessmentErrors((fe) => ({ ...fe, [field]: '' }));
    };

  const validatePatient = (): boolean => {
    const errors: Record<string, string> = {};
    if (!patient.patient_id_number.trim()) errors.patient_id_number = 'Required';
    if (!patient.full_name.trim()) errors.full_name = 'Required';
    else if (patient.full_name.trim().length < 2) errors.full_name = 'Min. 2 characters';
    const age = parseInt(patient.age, 10);
    if (!patient.age) errors.age = 'Required';
    else if (isNaN(age) || age < 10 || age > 60) errors.age = 'Must be 10–60';
    if (!patient.date_of_admission) errors.date_of_admission = 'Required';
    setPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAssessment = (): boolean => {
    const errors: Record<string, string> = {};
    const dur = parseInt(assessment.duration_labour_min, 10);
    if (!assessment.duration_labour_min) errors.duration_labour_min = 'Required';
    else if (isNaN(dur) || dur < 1 || dur > 9999) errors.duration_labour_min = 'Must be 1–9999 minutes';
    if (assessment.hiv_status_num === '') errors.hiv_status_num = 'Required';
    const parity = parseInt(assessment.parity_num, 10);
    if (assessment.parity_num === '') errors.parity_num = 'Required';
    else if (isNaN(parity) || parity < 0 || parity > 20) errors.parity_num = 'Must be 0–20';
    if (assessment.booked_unbooked === '') errors.booked_unbooked = 'Required';
    if (assessment.delivery_method_clean_lscs === '') errors.delivery_method_clean_lscs = 'Required';
    setAssessmentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validatePatient()) setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAssessment()) return;
    mutation.mutate({
      patient_id_number: patient.patient_id_number.trim(),
      full_name: patient.full_name.trim(),
      age: parseInt(patient.age, 10),
      date_of_admission: patient.date_of_admission,
      duration_labour_min: parseInt(assessment.duration_labour_min, 10),
      hiv_status_num: parseInt(assessment.hiv_status_num, 10),
      parity_num: parseInt(assessment.parity_num, 10),
      booked_unbooked: parseInt(assessment.booked_unbooked, 10),
      delivery_method_clean_lscs: parseInt(assessment.delivery_method_clean_lscs, 10),
    });
  };

  const pe = (f: string) => patientErrors[f];
  const ae = (f: string) => assessmentErrors[f];

  const durMin = parseInt(assessment.duration_labour_min, 10);
  const durDisplay = !isNaN(durMin) && durMin > 0 ? formatMinutesToHours(durMin) : null;

  // ── Step indicator ──────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-4">
      {([1, 2] as const).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{
              background: step >= n ? '#6B8CAE' : '#DDE3EA',
              color: step >= n ? '#fff' : '#6B7A8D',
            }}
          >
            {n}
          </div>
          <span className="text-xs font-medium" style={{ color: step >= n ? '#6B8CAE' : '#6B7A8D' }}>
            {n === 1 ? 'Patient Details' : 'PPH Assessment'}
          </span>
          {n < 2 && (
            <div className="w-8 h-px mx-1" style={{ background: step > 1 ? '#6B8CAE' : '#DDE3EA' }} />
          )}
        </div>
      ))}
    </div>
  );

  // ── Step 1 ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <form onSubmit={handleNext} className="space-y-3">
      <StepBar />

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
            style={{ ...inputStyle, ...errStyle(!!pe('patient_id_number')) }}
            placeholder="e.g. MH-2024-0042"
            value={patient.patient_id_number}
            onChange={setP('patient_id_number')}
            onFocus={focusHandler} onBlur={blurHandler}
          />
        </div>
        {pe('patient_id_number')
          ? <p className="text-[10px] text-red-500 mt-0.5">{pe('patient_id_number')}</p>
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
            style={{ ...inputStyle, ...errStyle(!!pe('full_name')) }}
            placeholder="e.g. Mary Nakato"
            value={patient.full_name}
            onChange={setP('full_name')}
            onFocus={focusHandler} onBlur={blurHandler}
          />
        </div>
        {pe('full_name') && <p className="text-[10px] text-red-500 mt-0.5">{pe('full_name')}</p>}
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
              style={{ ...inputStyle, ...errStyle(!!pe('age')) }}
              placeholder="e.g. 28"
              min={10} max={60}
              value={patient.age}
              onChange={setP('age')}
              onFocus={focusHandler} onBlur={blurHandler}
            />
          </div>
          {pe('age') && <p className="text-[10px] text-red-500 mt-0.5">{pe('age')}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Admission *</label>
          <input
            type="date"
            className="w-full px-3 py-2 rounded-lg text-sm text-gray-800 outline-none transition-all"
            style={{ ...inputStyle, ...errStyle(!!pe('date_of_admission')) }}
            max={today()}
            value={patient.date_of_admission}
            onChange={setP('date_of_admission')}
            onFocus={focusHandler} onBlur={blurHandler}
          />
          {pe('date_of_admission') && <p className="text-[10px] text-red-500 mt-0.5">{pe('date_of_admission')}</p>}
        </div>
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
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#6B8CAE', boxShadow: '0 4px 12px rgba(107,140,174,0.30)' }}
        >
          Next: Assessment
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  );

  // ── Step 2 ──────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <form onSubmit={handleSubmit} className="space-y-3">
      <StepBar />

      {/* Server error */}
      {ae('_server') && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)', color: '#B91C1C' }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{ae('_server')}</span>
        </div>
      )}

      {/* Duration of Labour */}
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
          value={assessment.duration_labour_min}
          onChange={setA('duration_labour_min')}
          onFocus={focusHandler} onBlur={blurHandler}
        />
        {ae('duration_labour_min')
          ? <p className="text-[10px] text-red-500 mt-0.5">{ae('duration_labour_min')}</p>
          : <p className="text-[10px] text-gray-400 mt-0.5">Enter total duration in minutes, e.g. 180 = 3 hours</p>
        }
      </div>

      {/* HIV Status + Parity row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">HIV Status *</label>
          <select
            className={selectCls}
            style={{ ...inputStyle, ...errStyle(!!ae('hiv_status_num')) }}
            value={assessment.hiv_status_num}
            onChange={setA('hiv_status_num')}
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
            value={assessment.parity_num}
            onChange={setA('parity_num')}
            onFocus={focusHandler} onBlur={blurHandler}
          />
          {ae('parity_num')
            ? <p className="text-[10px] text-red-500 mt-0.5">{ae('parity_num')}</p>
            : <p className="text-[10px] text-gray-400 mt-0.5">0 = first-time mother</p>
          }
        </div>
      </div>

      {/* Booking Status + Delivery Method row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Booking Status *</label>
          <select
            className={selectCls}
            style={{ ...inputStyle, ...errStyle(!!ae('booked_unbooked')) }}
            value={assessment.booked_unbooked}
            onChange={setA('booked_unbooked')}
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
            value={assessment.delivery_method_clean_lscs}
            onChange={setA('delivery_method_clean_lscs')}
            onFocus={focusHandler} onBlur={blurHandler}
          >
            <option value="">Select…</option>
            <option value="0">Vaginal</option>
            <option value="1">LSCS / Caesarean</option>
          </select>
          {ae('delivery_method_clean_lscs') && <p className="text-[10px] text-red-500 mt-0.5">{ae('delivery_method_clean_lscs')}</p>}
        </div>
      </div>

      {/* Info */}
      <div
        className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
        style={{ background: 'rgba(107,140,174,0.06)', border: '1px solid rgba(107,140,174,0.20)', color: '#4A6D8C' }}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Risk prediction is generated instantly on submission using the MediFlow PPH model.</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          style={{ border: '1px solid #DDE3EA' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
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
              Running prediction…
            </>
          ) : (
            <>
              Run Assessment
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 1 ? 'Add New Patient' : 'PPH Risk Assessment'}
      subtitle={
        step === 1
          ? 'Register a new patient — assessment follows on the next step'
          : `Assessing: ${patient.full_name || 'Patient'}`
      }
      maxWidth="md"
    >
      {step === 1 ? renderStep1() : renderStep2()}
    </Modal>
  );
};
