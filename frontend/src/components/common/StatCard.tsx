import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: number | string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  onClick?: () => void;
}

export const StatCard = ({
  icon,
  value,
  title,
  subtitle,
  accentColor = '#6B8CAE',
  onClick,
}: StatCardProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      }`}
      style={{
        background: '#ffffff',
        border: '1px solid #DDE3EA',
        boxShadow: '0 1px 3px rgba(26,37,53,0.08)',
        borderLeft: `4px solid ${accentColor}`,
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <span className="text-4xl font-bold leading-none tracking-tight" style={{ color: accentColor }}>
          {value}
        </span>
      </div>

      <div>
        <p className="font-semibold text-sm" style={{ color: '#1A2535' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: '#6B7A8D' }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
};
