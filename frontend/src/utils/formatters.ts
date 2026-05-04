export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatProbability = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatMinutesToHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

export const formatRole = (role: string): string => {
  const map: Record<string, string> = {
    admin: 'Admin',
    doctor: 'Doctor',
    midwife: 'Midwife',
    nurse: 'Nurse',
  };
  return map[role] ?? role;
};

export const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatHIVStatus = (value: number): string =>
  value === 1 ? 'Positive' : 'Negative';

export const formatBookingStatus = (value: number): string =>
  value === 1 ? 'Unbooked' : 'Booked';

export const formatDeliveryMethod = (lscs: number, forceps = 0): string =>
  lscs === 1 ? 'LSCS / Caesarean' : forceps === 1 ? 'Instrumental / Forceps' : 'Normal / Vaginal';
