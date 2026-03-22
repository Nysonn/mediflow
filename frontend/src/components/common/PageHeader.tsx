import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold" style={{ color: '#1A2535' }}>{title}</h1>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: '#6B7A8D' }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex gap-2 items-center">{actions}</div>}
  </div>
);
