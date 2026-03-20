interface RiskBadgeProps {
  risk: 'HIGH' | 'LOW' | '' | null;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge = ({ risk, size = 'md' }: RiskBadgeProps) => {
  if (!risk) {
    return (
      <span className="badge badge-ghost">No Assessment</span>
    );
  }

  if (risk === 'HIGH') {
    return (
      <span className={`badge badge-error gap-1 ${size === 'lg' ? 'badge-lg' : ''}`}>
        ⚠ HIGH RISK
      </span>
    );
  }

  return (
    <span className={`badge badge-success gap-1 ${size === 'lg' ? 'badge-lg' : ''}`}>
      ✓ LOW RISK
    </span>
  );
};
