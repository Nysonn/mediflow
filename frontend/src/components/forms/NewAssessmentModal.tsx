import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { AssessmentForm } from './AssessmentForm';
import type { Patient } from '../../types';

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

export const NewAssessmentModal = ({ patient, onClose }: Props) => {
  const navigate = useNavigate();

  const handleSuccess = (assessmentId: string) => {
    onClose();
    navigate(`/patients/${patient!.id}/assessments/${assessmentId}/result`);
  };

  return (
    <Modal
      isOpen={!!patient}
      onClose={onClose}
      title="New PPH Risk Assessment"
      subtitle={patient ? `Patient: ${patient.full_name} — ${patient.patient_id_number}` : undefined}
      maxWidth="md"
    >
      {patient && (
        <AssessmentForm patientId={patient.id} onSuccess={handleSuccess} />
      )}
    </Modal>
  );
};
