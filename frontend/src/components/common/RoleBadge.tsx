import type { Role } from '../../types';

interface RoleBadgeProps {
  role: Role;
}

const roleConfig: Record<Role, { label: string; bg: string; color: string }> = {
  admin: {
    label: 'Admin',
    bg: 'rgba(99,102,241,0.12)',
    color: '#4338CA',
  },
  doctor: {
    label: 'Doctor',
    bg: 'rgba(29,78,216,0.10)',
    color: '#1D4ED8',
  },
  midwife: {
    label: 'Midwife',
    bg: 'rgba(124,58,237,0.10)',
    color: '#7C3AED',
  },
  nurse: {
    label: 'Nurse',
    bg: 'rgba(5,150,105,0.10)',
    color: '#059669',
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const config = roleConfig[role] ?? { label: role, bg: 'rgba(99,102,241,0.10)', color: '#4338CA' };
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
};
