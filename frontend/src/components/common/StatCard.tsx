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
  accentColor = '#4A6D8C',
  onClick,
}: StatCardProps) => {
  return (
    <div
      className={`rounded-xl p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
      style={{
        background: '#ffffff',
        border: '1px solid #DDE3EA',
        boxShadow: '0 1px 3px rgba(26,37,53,0.06)',
      }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${accentColor}14`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <span className="text-3xl font-bold leading-none tracking-tight" style={{ color: '#1A2535' }}>
          {value}
        </span>
      </div>

      <div>
        <p className="text-sm font-medium" style={{ color: '#6B7A8D' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: accentColor }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
};
