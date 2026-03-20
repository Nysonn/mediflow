import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { PageHeader } from '../../components/common/PageHeader';
import { PatientForm } from '../../components/forms/PatientForm';
import { SkeletonCard } from '../../components/common/SkeletonCard';
import { useNotification } from '../../hooks/useNotification';
import type { CreatePatientInput } from '../../types';
import type { ApiError } from '../../types';

export const EditPatientPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    dispatch(setPageTitle('Edit Patient'));
  }, [dispatch]);

  const { data, isLoading } = useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.getById(id!),
    enabled: !!id,
  });

  // Update title with patient name once loaded
  useEffect(() => {
    if (data?.patient?.full_name) {
      dispatch(setPageTitle(`Edit Patient — ${data.patient.full_name}`));
    }
  }, [data?.patient?.full_name, dispatch]);

  const mutation = useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.update(id!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', id] });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      notify.success('Patient record updated successfully');
      navigate(`/patients/${id}`);
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) setServerErrors(apiErr.fields);
      else notify.error(apiErr?.error ?? 'Failed to update patient');
    },
  });

  const handleSubmit = async (data: CreatePatientInput) => {
    setServerErrors(undefined);
    await mutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data?.patient) {
    return (
      <div className="card bg-base-100 shadow-sm p-8 max-w-lg">
        <p className="text-base-content/60 mb-4">Patient not found.</p>
        <button className="btn btn-ghost btn-sm w-fit" onClick={() => navigate('/patients')}>
          ← Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Edit Patient"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/patients/${id}`)}>
            ← Back
          </button>
        }
      />

      <div className="alert alert-info">
        <span>Editing this record will not affect existing assessments.</span>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <PatientForm
            mode="edit"
            initialValues={data.patient}
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
            serverErrors={serverErrors}
          />
        </div>
      </div>
    </div>
  );
};
