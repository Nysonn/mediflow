import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientsApi } from '../../api/patients';
import { RiskBadge } from './RiskBadge';
import {
  formatDate,
  formatDateTime,
  formatProbability,
  formatMinutesToHours,
  formatHIVStatus,
  formatBookingStatus,
  formatDeliveryMethod,
} from '../../utils/formatters';
import type { Assessment } from '../../types';

interface Props {
  patientId: string | null;
  onClose: () => void;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
  </div>
);

const AssessmentCard = ({ a, index, total }: { a: Assessment; index: number; total: number }) => (
  <div
    className="rounded-xl p-4"
    style={{
      background: index === 0 ? 'rgba(74,109,140,0.06)' : '#F4F6F8',
      border: index === 0 ? '1px solid rgba(74,109,140,0.20)' : '1px solid #DDE3EA',
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <RiskBadge risk={a.risk_level} />
        {index === 0 && total > 1 && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: '#4A6D8C', backgroundColor: 'rgba(74,109,140,0.12)' }}>
            Latest
          </span>
        )}
      </div>
      <span className="text-xs text-gray-400">{formatDateTime(a.created_at)}</span>
    </div>

    {/* Result row */}
    <div className="grid grid-cols-2 gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <Field label="Severe PPH Probability" value={formatProbability(a.probability_severe_pph)} />
      <Field label="No PPH Probability" value={formatProbability(a.probability_no_pph)} />
    </div>

    {/* Inputs grid */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Field label="Labour Duration" value={formatMinutesToHours(a.duration_labour_min)} />
      <Field label="HIV Status" value={formatHIVStatus(a.hiv_status_num)} />
      <Field label="Parity" value={a.parity_num} />
      <Field label="Booking Status" value={formatBookingStatus(a.booked_unbooked)} />
      <Field label="Delivery Method" value={formatDeliveryMethod(a.delivery_method_clean_lscs, a.delivery_method_clean_forceps)} />
      <Field label="Assessed By" value={(a as Assessment & { assessed_by_name?: string }).assessed_by_name ?? '—'} />
    </div>
  </div>
);

export const PatientQuickViewModal = ({ patientId, onClose }: Props) => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', patientId],
    queryFn: () => patientsApi.getById(patientId!),
    enabled: !!patientId,
  });

  useEffect(() => {
    if (!patientId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [patientId, onClose]);

  useEffect(() => {
    document.body.style.overflow = patientId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [patientId]);

  if (!patientId) return null;

  const patient = data?.patient;
  const assessments = data?.assessments ?? [];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.50)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  };

  const panelStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '1.25rem',
    boxShadow: '0 24px 64px rgba(15,23,42,0.18), 0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(255,255,255,0.80)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    position: 'relative',
  };

  return createPortal(
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: '#4A6D8C' }}
            >
              {isLoading ? '…' : (patient?.full_name?.[0] ?? '?')}
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {isLoading ? 'Loading…' : (patient?.full_name ?? 'Patient')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isLoading ? '' : (patient?.patient_id_number ?? '')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : !patient ? (
            <p className="text-sm text-gray-500 text-center py-8">Patient not found.</p>
          ) : (
            <>
              {/* Patient Info Card */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Patient Information
                </p>
                <div
                  className="rounded-xl p-4 grid grid-cols-2 gap-4"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                >
                  <Field label="Full Name" value={patient.full_name} />
                  <Field label="Patient ID" value={patient.patient_id_number} />
                  <Field label="Age" value={`${patient.age} years`} />
                  <Field label="Date of Admission" value={formatDate(patient.date_of_admission)} />
                  <Field label="Added By" value={patient.added_by_name} />
                  <Field label="Record Created" value={formatDateTime(patient.created_at)} />
                </div>
              </div>

              {/* Risk summary */}
              {data?.latest_risk && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Current Risk Status
                  </span>
                  <RiskBadge risk={data.latest_risk as 'HIGH' | 'LOW' | ''} />
                </div>
              )}

              {/* Assessment History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Assessment History
                  </p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(74,109,140,0.10)', color: '#4A6D8C' }}
                  >
                    {assessments.length} {assessments.length === 1 ? 'assessment' : 'assessments'}
                  </span>
                </div>

                {assessments.length === 0 ? (
                  <div
                    className="rounded-xl p-6 text-center"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    <p className="text-sm text-gray-400">No assessments have been run for this patient yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {assessments.map((a, i) => (
                      <AssessmentCard key={a.id} a={a} index={i} total={assessments.length} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {patient && (
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); navigate(`/patients/${patientId}`); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#4A6D8C' }}
            >
              View Full Profile
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
