import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { AssessmentForm } from '../../components/forms/AssessmentForm';

export const NewAssessmentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(setPageTitle('New Assessment'));
  }, [dispatch]);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  const patient = data?.patient;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-xl font-bold mb-2">Patient not found</p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>
          ← Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader
        title="New PPH Risk Assessment"
        subtitle={`Patient: ${patient.full_name} — ${patient.patient_id_number}`}
        actions={
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/patients/${id}`)}
          >
            ← Back
          </button>
        }
      />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <AssessmentForm patientId={id!} />
        </div>
      </div>
    </div>
  );
};
