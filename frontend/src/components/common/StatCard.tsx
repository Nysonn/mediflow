import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: number | string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export const StatCard = ({
  icon,
  value,
  title,
  subtitle,
  onClick,
}: StatCardProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.60)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.65)',
        boxShadow: '0 4px 24px rgba(99, 102, 241, 0.08), 0 1px 4px rgba(0,0,0,0.05)',
      }}
      onClick={onClick}
    >
      {/* Subtle top-right glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.12] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
      />

      <div className="relative">
        {/* Icon + value */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(99, 102, 241, 0.10)',
              color: '#4338CA',
            }}
          >
            {icon}
          </div>
          <span className="text-4xl font-bold leading-none tracking-tight" style={{ color: '#1e1b4b' }}>
            {value}
          </span>
        </div>

        {/* Title + subtitle */}
        <div>
          <p className="font-semibold text-sm" style={{ color: '#374151' }}>{title}</p>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom accent — single unified theme color */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
      />
    </div>
  );
};
