import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { setPageTitle } from '../../store/slices/uiSlice';
import { patientsApi } from '../../api/patients';
import { PageHeader } from '../../components/common/PageHeader';
import { PatientForm } from '../../components/forms/PatientForm';
import { useNotification } from '../../hooks/useNotification';
import type { CreatePatientInput } from '../../types';
import type { ApiError } from '../../types';

export const AddPatientPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    dispatch(setPageTitle('Add Patient'));
  }, [dispatch]);

  const mutation = useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.create(input),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      notify.success('Patient record created successfully');
      navigate(`/patients/${patient.id}`);
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: ApiError } })?.response?.data;
      if (apiErr?.fields) setServerErrors(apiErr.fields);
      else notify.error(apiErr?.error ?? 'Failed to create patient');
    },
  });

  const handleSubmit = async (data: CreatePatientInput) => {
    setServerErrors(undefined);
    await mutation.mutateAsync(data);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="Add New Patient"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patients')}>
            ← Back
          </button>
        }
      />
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <PatientForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
            serverErrors={serverErrors}
          />
        </div>
      </div>
    </div>
  );
};
