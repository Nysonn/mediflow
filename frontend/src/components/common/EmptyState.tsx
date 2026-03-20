import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16">
    {icon && (
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}
      >
        {icon}
      </div>
    )}
    <p className="text-sm font-semibold text-gray-600">{title}</p>
    {description && (
      <p className="text-xs text-gray-400 mt-1 text-center max-w-xs">{description}</p>
    )}
    {actionLabel && onAction && (
      <button
        className="mt-5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #1D4ED8, #4338CA)' }}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
