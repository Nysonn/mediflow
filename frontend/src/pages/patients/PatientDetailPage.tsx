import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { PageHeader } from '../../components/common/PageHeader';
import { RiskBadge } from '../../components/common/RiskBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import { EditAssessmentModal } from '../../components/forms/EditAssessmentModal';
import { EditPatientModal } from '../../components/forms/EditPatientModal';
import { NewAssessmentModal } from '../../components/forms/NewAssessmentModal';
import type { Assessment, Patient } from '../../types';
import { PPH_COLOURS, getSeverityColours } from '../../theme/pphTheme';
import { getRelevantClinicalNotes } from '../../data/clinicalNotes';
import {
  formatDate,
  formatDateTime,
  formatProbability,
  formatMinutesToHours,
  formatHIVStatus,
  formatBookingStatus,
  formatDeliveryMethod,
} from '../../utils/formatters';

// Full-page skeleton while data loads
const DetailSkeleton = () => (
  <div className="space-y-6">
    <div className="skeleton h-10 w-64 rounded" />
    <div className="skeleton h-32 w-full rounded-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
    <SkeletonTable rows={3} cols={9} />
  </div>
);

// Risk banner displayed below the header
interface RiskBannerProps {
  latestRisk: string;
  probabilitySeverePPH?: number;
}

const RiskBanner = ({ latestRisk, probabilitySeverePPH }: RiskBannerProps) => {
  if (!latestRisk) {
    return (
      <div className="card bg-base-300 p-6 flex flex-row items-center gap-4">
        {/* <span className="text-4xl">📋</span> */}
        <div>
          <p className="text-base-content/70 font-medium">No assessment has been run for this patient yet.</p>
        </div>
      </div>
    );
  }

  if (latestRisk === 'HIGH') {
    return (
      <div className="risk-high-banner card bg-error text-error-content p-6 flex flex-row items-center gap-6 animate-pulse">
        {/* <span className="text-5xl">⚠️</span> */}
        <div>
          <p className="text-3xl font-extrabold tracking-wide">HIGH RISK</p>
          <p className="text-lg font-semibold opacity-90">Severe Postpartum Hemorrhage Predicted</p>
          {probabilitySeverePPH != null && (
            <p className="opacity-80 mt-1">
              Probability: <strong>{formatProbability(probabilitySeverePPH)}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-success text-success-content p-6 flex flex-row items-center gap-6">
      {/* <span className="text-5xl">✅</span> */}
      <div>
        <p className="text-3xl font-extrabold tracking-wide">LOW RISK</p>
        <p className="text-lg font-semibold opacity-90">Low risk of Severe Postpartum Hemorrhage</p>
        {probabilitySeverePPH != null && (
          <p className="opacity-80 mt-1">
            Probability: <strong>{formatProbability(probabilitySeverePPH)}</strong>
          </p>
        )}
      </div>
    </div>
  );
};

// ── AssessmentHistoryCard ─────────────────────────────────────────────────────

interface AssessmentHistoryCardProps {
  assessment: Assessment;
  index: number;
  patientId: string;
  onEdit: (a: Assessment) => void;
  navigate: ReturnType<typeof useNavigate>;
}

const AssessmentHistoryCard = ({ assessment: a, index, patientId, onEdit, navigate }: AssessmentHistoryCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const probability = a.probability_severe_pph ?? 0;
  const severityColours = getSeverityColours(probability);
  const pctSeverePPH = Math.round(probability * 100);
  const pctNoPPH = Math.round((a.probability_no_pph ?? 0) * 100);
  const isHigh = a.risk_level === 'HIGH';

  const clinicalNotes = getRelevantClinicalNotes({
    duration_labour_min: a.duration_labour_min,
    hiv_status_num: a.hiv_status_num,
    parity_num: a.parity_num,
    booked_unbooked: a.booked_unbooked,
    delivery_method_clean_forceps: a.delivery_method_clean_forceps,
    delivery_method_clean_lscs: a.delivery_method_clean_lscs,
  });

  return (
    <div
      className={`rounded-xl border transition-shadow ${
        index === 0 ? 'border-base-300 shadow-md' : 'border-base-200 shadow-sm'
      } bg-base-100`}
    >
      {/* ── Header row (always visible) ── */}
      <button
        className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-3"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Index label */}
        {index === 0 && (
          <span className="badge badge-neutral badge-sm shrink-0">Latest</span>
        )}

        {/* Date */}
        <span className="text-sm font-medium text-base-content/70 shrink-0 w-40">
          {formatDateTime(a.created_at)}
        </span>

        {/* Risk badge */}
        <span className="shrink-0">
          <RiskBadge risk={a.risk_level} />
        </span>

        {/* Probability pill */}
        <span
          className="px-3 py-0.5 rounded-full text-sm font-bold shrink-0"
          style={{ backgroundColor: severityColours.lightBackground, color: severityColours.border }}
        >
          {formatProbability(probability)} Severe PPH
        </span>

        {/* Quick-glance inputs */}
        <span className="text-sm text-base-content/60 hidden sm:inline shrink-0">
          {formatMinutesToHours(a.duration_labour_min)} labour · {formatDeliveryMethod(a.delivery_method_clean_lscs, a.delivery_method_clean_forceps)} · {formatBookingStatus(a.booked_unbooked)}
        </span>

        {/* Assessed by */}
        <span className="text-xs text-base-content/40 hidden md:inline ml-auto shrink-0">
          by {a.assessed_by_name}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-base-content/40 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-base-200">

          {/* Risk result banner */}
          <div
            className="mt-4 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              background: severityColours.lightBackground,
              border: `2px solid ${severityColours.border}`,
            }}
          >
            <div className="flex-1">
              <p className="text-2xl font-extrabold tracking-wide" style={{ color: severityColours.border }}>
                {isHigh ? 'HIGH RISK' : 'LOW RISK'}
              </p>
              <p className="text-sm font-medium opacity-80" style={{ color: severityColours.border }}>
                {isHigh
                  ? 'Severe Postpartum Hemorrhage Predicted'
                  : 'Low risk of Severe Postpartum Hemorrhage'}
              </p>
            </div>

            {/* Probability breakdown */}
            <div className="sm:w-48 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: severityColours.border }}>
                  <span>No Severe PPH</span>
                  <span className="font-bold">{formatProbability(a.probability_no_pph)}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.4)' }}>
                  <div className="h-full rounded-full bg-success" style={{ width: `${pctNoPPH}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: severityColours.border }}>
                  <span>Severe PPH</span>
                  <span className="font-bold">{formatProbability(probability)}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.4)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pctSeverePPH}%`, backgroundColor: PPH_COLOURS.severe.background }} />
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Inputs grid */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40 mb-3">
              Clinical Input Data
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Labour Duration', value: `${formatMinutesToHours(a.duration_labour_min)}`, sub: `${a.duration_labour_min} min` },
                { label: 'HIV Status', value: formatHIVStatus(a.hiv_status_num) },
                { label: 'Parity', value: `${a.parity_num}`, sub: 'previous deliveries' },
                { label: 'Booking Status', value: formatBookingStatus(a.booked_unbooked) },
                { label: 'Delivery Method', value: formatDeliveryMethod(a.delivery_method_clean_lscs, a.delivery_method_clean_forceps) },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-lg bg-base-200 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-base-content/40 mb-0.5">{label}</p>
                  <p className="font-semibold text-sm leading-snug">{value}</p>
                  {sub && <p className="text-[11px] text-base-content/40">{sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className={`rounded-xl px-4 py-3 text-sm ${isHigh ? 'bg-error/10 border border-error/20' : 'bg-info/10 border border-info/20'}`}>
            <p className={`font-bold mb-1 ${isHigh ? 'text-error' : 'text-info'}`}>
              {isHigh ? 'Recommended Actions' : 'Clinical Note'}
            </p>
            <p className={isHigh ? 'text-error/80' : 'text-info/80'}>
              {isHigh
                ? 'Ensure active management of the third stage of labour, have uterotonics ready, establish IV access, ensure blood products are available, and consider consultant review.'
                : 'Standard postpartum monitoring protocols apply. Observe for unexpected clinical changes.'}
            </p>
          </div>

          {/* Clinical Decision Support Notes */}
          {clinicalNotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-base-content/40 mb-2">
                Clinical Decision Support Notes
                <span className="ml-1 text-[10px] font-normal normal-case text-base-content/30">Ref: WHO/RHR/12.30 · NICE NG121</span>
              </p>
              <ul className="space-y-2">
                {clinicalNotes.map((note, i) => {
                  const urgencyColour =
                    note.urgency === 'high'
                      ? PPH_COLOURS.severe.background
                      : note.urgency === 'medium'
                      ? PPH_COLOURS.moderate.background
                      : PPH_COLOURS.mild.background;
                  const urgencyLabel =
                    note.urgency === 'high' ? 'High' : note.urgency === 'medium' ? 'Medium' : 'Standard';
                  return (
                    <li key={i} className="flex gap-2 text-sm">
                      <span
                        className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: urgencyColour }}
                        aria-hidden="true"
                      />
                      <span>
                        <span
                          className="text-[10px] font-bold uppercase mr-1"
                          style={{ color: urgencyColour }}
                        >
                          [{urgencyLabel}]
                        </span>
                        {note.note}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/patients/${patientId}/assessments/${a.id}/result`)}
            >
              View Full Result & XAI
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onEdit(a)}
            >
              Edit Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PatientDetailPage ──────────────────────────────────────────────────────────

export const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [newAssessmentPatient, setNewAssessmentPatient] = useState<Patient | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const patient = data?.patient;
  const assessments = data?.assessments ?? [];
  const latestRisk = data?.latest_risk ?? '';
  const mostRecent = assessments[0];

  useEffect(() => {
    if (patient?.full_name) {
      dispatch(setPageTitle(patient.full_name));
    }
  }, [patient?.full_name, dispatch]);

  if (isLoading) return <DetailSkeleton />;

  if (!patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-xl font-bold mb-2">Patient not found</p>
        <p className="text-base-content/60 mb-4">
          This patient record does not exist or may have been removed.
        </p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>
          ← Back to Patients
        </button>
      </div>
    );
  }

  const newAssessmentPath = `/patients/${id}/assessments/new`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.full_name}
        subtitle={`Patient ID: ${patient.patient_id_number}`}
        actions={
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingPatient(patient)}
            >
              Edit Patient
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setNewAssessmentPatient(patient)}
            >
              + New Assessment
            </button>
          </div>
        }
      />

      {/* Risk Banner */}
      <RiskBanner
        latestRisk={latestRisk}
        probabilitySeverePPH={mostRecent?.probability_severe_pph}
      />

      {/* Patient Information Card */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg mb-2">Patient Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Full Name</p>
              <p className="font-semibold">{patient.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Patient ID Number</p>
              <p className="font-mono">{patient.patient_id_number}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Age</p>
              <p>{patient.age} years</p>
            </div>
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Date of Admission</p>
              <p>{formatDate(patient.date_of_admission)}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Added By</p>
              <p>{patient.added_by_name}</p>
            </div>
            <div>
              <p className="text-sm text-base-content/50 font-medium uppercase tracking-wide">Record Created</p>
              <p>{formatDateTime(patient.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment History */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="mb-4">
            <h3 className="card-title text-lg">
              Assessment History
              <span className="badge badge-neutral ml-2">{assessments.length}</span>
            </h3>
            {assessments.length > 0 && (
              <p className="text-xs text-base-content/40 mt-1">Click any row to expand full details</p>
            )}
          </div>

          {assessments.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No assessments yet"
              description="Run an assessment to predict postpartum hemorrhage risk."
              actionLabel="Run First Assessment"
              onAction={() => navigate(newAssessmentPath)}
            />
          ) : (
            <div className="space-y-3">
              {assessments.map((a, idx) => (
                <AssessmentHistoryCard
                  key={a.id}
                  assessment={a}
                  index={idx}
                  patientId={id!}
                  onEdit={setEditingAssessment}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EditAssessmentModal
        patientId={id!}
        assessment={editingAssessment}
        onClose={() => setEditingAssessment(null)}
      />

      <EditPatientModal
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
      />

      <NewAssessmentModal
        patient={newAssessmentPatient}
        onClose={() => setNewAssessmentPatient(null)}
      />
    </div>
  );
};
