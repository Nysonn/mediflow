import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { assessmentsApi } from '../../api/assessments';
import { patientsApi } from '../../api/patients';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { SkeletonTable } from '../../components/common/SkeletonTable';
import {
  formatDateTime,
  formatProbability,
  formatMinutesToHours,
  formatHIVStatus,
  formatBookingStatus,
  formatDeliveryMethod,
} from '../../utils/formatters';

const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="skeleton h-10 w-72 rounded" />
    <div className="skeleton h-48 w-full rounded-xl" />
    <SkeletonCard />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <SkeletonTable rows={2} cols={4} />
  </div>
);

export const AssessmentResultPage = () => {
  const { id, assessmentId } = useParams<{ id: string; assessmentId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(setPageTitle('Assessment Result'));
  }, [dispatch]);

  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ['assessments', id, assessmentId],
    queryFn: () => assessmentsApi.getById(id!, assessmentId!),
    enabled: !!id && !!assessmentId,
  });

  const { data: patientData, isLoading: patientLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const isLoading = assessmentLoading || patientLoading;
  const patient = patientData?.patient;
  const isHigh = assessment?.risk_level === 'HIGH';

  if (isLoading) return <PageSkeleton />;

  if (!assessment || !patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-xl font-bold mb-2">Assessment not found</p>
        <p className="text-base-content/60 mb-4">This assessment record could not be loaded.</p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>
          ← Back to Patients
        </button>
      </div>
    );
  }

  const pctNoPPH = Math.round(assessment.probability_no_pph * 100);
  const pctSeverePPH = Math.round(assessment.probability_severe_pph * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Result"
        subtitle={`Patient: ${patient.full_name} — ${patient.patient_id_number}`}
      />
      <p className="text-sm text-base-content/50 -mt-4">
        Assessed: {formatDateTime(assessment.created_at)}
      </p>

      {/* 1. PRIMARY RISK RESULT BANNER */}
      {isHigh ? (
        <div
          className="risk-high risk-high-banner rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: '#FDECEA', border: '2px solid #C0392B', color: '#922B21' }}
        >
          <span className="text-7xl" style={{ color: '#C0392B' }}>⚠</span>
          <div className="text-center sm:text-left">
            <p className="text-5xl font-extrabold tracking-widest">HIGH RISK</p>
            <p className="text-xl font-semibold mt-1 opacity-90">Severe Postpartum Hemorrhage Predicted</p>
            <p className="text-4xl font-bold mt-3">
              {formatProbability(assessment.probability_severe_pph)}
              <span className="text-lg font-normal ml-2 opacity-75">probability of Severe PPH</span>
            </p>
          </div>
        </div>
      ) : (
        <div
          className="risk-low rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6"
          style={{ background: '#EAF4EE', border: '2px solid #5B8A6F', color: '#2E6B4A' }}
        >
          <span className="text-7xl" style={{ color: '#5B8A6F' }}>✓</span>
          <div className="text-center sm:text-left">
            <p className="text-5xl font-extrabold tracking-widest">LOW RISK</p>
            <p className="text-xl font-semibold mt-1 opacity-90">No Severe Postpartum Hemorrhage Predicted</p>
            <p className="text-4xl font-bold mt-3">
              {formatProbability(assessment.probability_severe_pph)}
              <span className="text-lg font-normal ml-2 opacity-75">probability of Severe PPH</span>
            </p>
          </div>
        </div>
      )}

      {/* 2. CLINICAL RECOMMENDATION CARD */}
      {isHigh ? (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold text-lg">Recommended Actions</h3>
            <p className="mt-1">
              This patient has been identified as <strong>HIGH RISK</strong> for Severe Postpartum Hemorrhage.
              The clinical team should ensure active management of the third stage of labour, have uterotonics
              readily available, establish IV access, ensure blood products are available, and consider consultant review.
            </p>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-bold text-lg">Clinical Note</h3>
            <p className="mt-1">
              This patient has been assessed as <strong>LOW RISK</strong> for Severe PPH.
              Standard postpartum monitoring protocols apply. Continue to observe for any unexpected clinical changes.
            </p>
          </div>
        </div>
      )}

      {/* 3. PROBABILITY BREAKDOWN CARD */}
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Probability Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="font-medium mb-1" style={{ color: '#6B7A8D' }}>No Severe PPH</p>
              <p className="text-4xl font-bold" style={{ color: '#5B8A6F' }}>{formatProbability(assessment.probability_no_pph)}</p>
              <div className="w-full mt-3 rounded-full overflow-hidden" style={{ height: '8px', background: '#DDE3EA' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pctNoPPH}%`, backgroundColor: '#5B8A6F' }}
                />
              </div>
            </div>
            <div>
              <p className="font-medium mb-1" style={{ color: '#6B7A8D' }}>Severe PPH</p>
              <p className="text-4xl font-bold" style={{ color: '#C0392B' }}>{formatProbability(assessment.probability_severe_pph)}</p>
              <div className="w-full mt-3 rounded-full overflow-hidden" style={{ height: '8px', background: '#DDE3EA' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pctSeverePPH}%`, backgroundColor: '#C0392B' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INPUT DATA SUMMARY — collapsible */}
      <div className="collapse collapse-arrow bg-base-100 shadow-sm">
        <input type="checkbox" />
        <div className="collapse-title text-base font-medium">
          Assessment Input Data — Click to expand
        </div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-2">
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Duration of Labour</p>
              <p className="font-semibold">{formatMinutesToHours(assessment.duration_labour_min)}</p>
              <p className="text-xs text-base-content/40">{assessment.duration_labour_min} minutes</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">HIV Status</p>
              <p className="font-semibold">{formatHIVStatus(assessment.hiv_status_num)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Parity</p>
              <p className="font-semibold">{assessment.parity_num} previous live births</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Booking Status</p>
              <p className="font-semibold">{formatBookingStatus(assessment.booked_unbooked)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Delivery Method</p>
              <p className="font-semibold">{formatDeliveryMethod(assessment.delivery_method_clean_lscs)}</p>
            </div>
            <div>
              <p className="text-xs text-base-content/50 uppercase tracking-wide font-medium">Assessed By</p>
              <p className="font-semibold">{assessment.assessed_by_name}</p>
            </div>
          </div>
          <p className="text-xs text-base-content/30 mt-4">Assessment ID: {assessment.id}</p>
        </div>
      </div>

      {/* 5. ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3 pb-6">
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/patients/${id}`)}
        >
          View Patient Record
        </button>
        <button
          className="btn btn-outline"
          onClick={() => navigate(`/patients/${id}/assessments/new`)}
        >
          Run Another Assessment
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/patients')}
        >
          Back to Patients List
        </button>
      </div>
    </div>
  );
};
