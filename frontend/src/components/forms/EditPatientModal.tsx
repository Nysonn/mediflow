import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../../api/patients';
import { useNotification } from '../../hooks/useNotification';
import { Modal } from '../common/Modal';
import { PatientForm } from './PatientForm';
import type { Patient, CreatePatientInput, ApiError } from '../../types';

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

export const EditPatientModal = ({ patient, onClose }: Props) => {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [serverErrors, setServerErrors] = useState<Record<string, string> | undefined>();

  const mutation = useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.update(patient!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', patient!.id] });
      queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
      notify.success('Patient record updated successfully');
      onClose();
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

  return (
    <Modal
      isOpen={!!patient}
      onClose={onClose}
      title="Edit Patient"
      subtitle={patient ? `Editing record for ${patient.full_name}` : undefined}
      maxWidth="md"
    >
      <div className="alert alert-info mb-4 text-sm">
        <span>Editing this record will not affect existing assessments.</span>
      </div>
      {patient && (
        <PatientForm
          mode="edit"
          initialValues={patient}
          onSubmit={handleSubmit}
          isLoading={mutation.isPending}
          serverErrors={serverErrors}
        />
      )}
    </Modal>
  );
};
