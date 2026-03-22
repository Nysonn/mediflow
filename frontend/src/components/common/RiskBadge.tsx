interface RiskBadgeProps {
  risk: 'HIGH' | 'LOW' | '' | null;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge = ({ risk, size = 'md' }: RiskBadgeProps) => {
  if (!risk) {
    return (
      <span
        className="badge"
        style={{
          backgroundColor: '#F4F6F8',
          color: '#6B7A8D',
          border: '1px solid #DDE3EA',
        }}
      >
        No Assessment
      </span>
    );
  }

  if (risk === 'HIGH') {
    return (
      <span
        className={`badge gap-1 ${size === 'lg' ? 'badge-lg' : ''}`}
        style={{
          backgroundColor: '#FDECEA',
          color: '#922B21',
          border: '1px solid #C0392B',
        }}
      >
        ⚠ HIGH RISK
      </span>
    );
  }

  return (
    <span
      className={`badge gap-1 ${size === 'lg' ? 'badge-lg' : ''}`}
      style={{
        backgroundColor: '#EAF4EE',
        color: '#2E6B4A',
        border: '1px solid #5B8A6F',
      }}
    >
      ✓ LOW RISK
    </span>
  );
};
