import type { Role } from '../../types';

interface RoleBadgeProps {
  role: Role;
}

const roleConfig: Record<Role, { label: string; style: React.CSSProperties }> = {
  admin: {
    label: 'Admin',
    style: { backgroundColor: '#2C3E6B', color: '#fff' },
  },
  doctor: {
    label: 'Doctor',
    style: { backgroundColor: '#6B8CAE', color: '#fff' },
  },
  midwife: {
    label: 'Midwife',
    style: { backgroundColor: '#4A6D8C', color: '#fff' },
  },
  nurse: {
    label: 'Nurse',
    style: { backgroundColor: '#5B8A6F', color: '#fff' },
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const config = roleConfig[role] ?? { label: role, style: { backgroundColor: '#6B8CAE', color: '#fff' } };
  return (
    <span
      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
      style={config.style}
    >
      {config.label}
    </span>
  );
};
