import { useState, useEffect } from 'react';
import type { CreatePatientInput } from '../../types';

interface PatientFormValues {
  patient_id_number: string;
  full_name: string;
  age: string;
  date_of_admission: string;
}

interface PatientFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<CreatePatientInput & { age: number }>;
  onSubmit: (data: CreatePatientInput) => Promise<void>;
  isLoading: boolean;
  serverErrors?: Record<string, string>;
}

const today = () => new Date().toISOString().split('T')[0];

export const PatientForm = ({
  mode,
  initialValues,
  onSubmit,
  isLoading,
  serverErrors,
}: PatientFormProps) => {
  const [form, setForm] = useState<PatientFormValues>({
    patient_id_number: '',
    full_name: '',
    age: '',
    date_of_admission: mode === 'create' ? today() : '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        patient_id_number: initialValues.patient_id_number ?? '',
        full_name: initialValues.full_name ?? '',
        age: initialValues.age != null ? String(initialValues.age) : '',
        date_of_admission: initialValues.date_of_admission
          ? initialValues.date_of_admission.split('T')[0]
          : '',
      });
    }
  }, [initialValues]);

  useEffect(() => {
    if (serverErrors) {
      setFieldErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  const set = (field: keyof PatientFormValues) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = field === 'patient_id_number'
      ? e.target.value.toUpperCase()
      : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({ ...fe, [field]: '' }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.patient_id_number.trim())
      errors.patient_id_number = 'Patient ID number is required';
    if (!form.full_name.trim())
      errors.full_name = 'Full name is required';
    else if (form.full_name.trim().length < 2)
      errors.full_name = 'Full name must be at least 2 characters';
    const ageNum = parseInt(form.age, 10);
    if (!form.age) errors.age = 'Age is required';
    else if (isNaN(ageNum) || ageNum < 10 || ageNum > 60)
      errors.age = 'Age must be between 10 and 60';
    if (!form.date_of_admission)
      errors.date_of_admission = 'Date of admission is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      patient_id_number: form.patient_id_number.trim(),
      full_name: form.full_name.trim(),
      age: parseInt(form.age, 10),
      date_of_admission: form.date_of_admission,
    });
  };

  const err = (field: string) => fieldErrors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient ID Number */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Patient ID Number *</span>
        </label>
        <input
          type="text"
          className={`input input-bordered ${err('patient_id_number') ? 'input-error' : ''}`}
          placeholder="e.g. MH-2024-0042"
          value={form.patient_id_number}
          onChange={set('patient_id_number')}
        />
        <label className="label">
          {err('patient_id_number') ? (
            <span className="label-text-alt text-error">{err('patient_id_number')}</span>
          ) : (
            <span className="label-text-alt text-base-content/50">
              Hospital or clinic assigned ID number
            </span>
          )}
        </label>
      </div>

      {/* Full Name */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Full Name *</span>
        </label>
        <input
          type="text"
          className={`input input-bordered ${err('full_name') ? 'input-error' : ''}`}
          placeholder="e.g. Mary Nakato"
          value={form.full_name}
          onChange={set('full_name')}
        />
        {err('full_name') && (
          <label className="label">
            <span className="label-text-alt text-error">{err('full_name')}</span>
          </label>
        )}
      </div>

      {/* Age */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Age *</span>
        </label>
        <input
          type="number"
          className={`input input-bordered w-32 ${err('age') ? 'input-error' : ''}`}
          placeholder="e.g. 28"
          min={10}
          max={60}
          value={form.age}
          onChange={set('age')}
        />
        {err('age') && (
          <label className="label">
            <span className="label-text-alt text-error">{err('age')}</span>
          </label>
        )}
      </div>

      {/* Date of Admission */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Date of Admission *</span>
        </label>
        <input
          type="date"
          className={`input input-bordered w-48 ${err('date_of_admission') ? 'input-error' : ''}`}
          max={today()}
          value={form.date_of_admission}
          onChange={set('date_of_admission')}
        />
        {err('date_of_admission') && (
          <label className="label">
            <span className="label-text-alt text-error">{err('date_of_admission')}</span>
          </label>
        )}
      </div>

      <div className="form-control pt-2">
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : mode === 'create' ? (
            'Save Patient Record'
          ) : (
            'Update Patient Record'
          )}
        </button>
      </div>
    </form>
  );
};
