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
import type { Assessment } from '../../types';
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

export const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);

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
              onClick={() => navigate(`/patients/${id}/edit`)}
            >
              Edit Patient
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(newAssessmentPath)}
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg">
              Assessment History
              <span className="badge badge-neutral ml-2">{assessments.length}</span>
            </h3>
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
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Risk Level</th>
                    <th>Severe PPH Prob.</th>
                    <th>Labour Duration</th>
                    <th>HIV Status</th>
                    <th>Parity</th>
                    <th>Booking</th>
                    <th>Delivery Method</th>
                    <th>Assessed By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a, idx) => (
                    <tr
                      key={a.id}
                      className={idx === 0 ? 'bg-base-200' : ''}
                    >
                      <td className="whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                      <td><RiskBadge risk={a.risk_level} /></td>
                      <td className="font-mono">{formatProbability(a.probability_severe_pph)}</td>
                      <td>{formatMinutesToHours(a.duration_labour_min)}</td>
                      <td>{formatHIVStatus(a.hiv_status_num)}</td>
                      <td>{a.parity_num}</td>
                      <td>{formatBookingStatus(a.booked_unbooked)}</td>
                      <td>{formatDeliveryMethod(a.delivery_method_clean_lscs)}</td>
                      <td>{a.assessed_by_name}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigate(`/patients/${id}/assessments/${a.id}/result`)}
                          >
                            View
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => setEditingAssessment(a)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EditAssessmentModal
        patientId={id!}
        assessment={editingAssessment}
        onClose={() => setEditingAssessment(null)}
      />
    </div>
  );
};
