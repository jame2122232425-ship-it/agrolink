import React from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  icon,
  action,
  meta,
}) => (
  <header className="app-page-header">
    <div className="app-page-header-copy">
      {icon && <span className="app-page-icon" aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        <p className="app-page-eyebrow">{eyebrow}</p>
        <h1 className="app-page-title">{title}</h1>
        {description && <p className="app-page-description">{description}</p>}
        {meta && <div className="app-page-meta">{meta}</div>}
      </div>
    </div>
    {action && <div className="app-page-action">{action}</div>}
  </header>
);
