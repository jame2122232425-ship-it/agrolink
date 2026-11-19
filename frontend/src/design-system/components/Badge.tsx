import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'forest' | 'neutral' | 'harvest';
  size?: 'sm' | 'md';
  hasDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  hasDot = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center font-medium rounded-lg whitespace-nowrap select-none transition-colors';

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantClasses = {
    // Green success: Optimal soil moisture, healthy crop, verified
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/70',
    // Amber warning: Rain shortage, fertilizer deficit
    warning: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    // Harvest amber: High demand market crop, ripe for harvest
    harvest: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]',
    // Red error: Pest infestation, severe disease alert
    error: 'bg-red-50 text-red-800 border border-red-200/70',
    // Blue info: Market update, agronomist consultation
    info: 'bg-blue-50 text-blue-800 border border-blue-200/70',
    // Deep forest: Official KALRO verified, AgroLink core
    forest: 'bg-[#E2F0D9] text-[#14532D] border border-[#A9DFBF]/80',
    // Neutral slate
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/70',
  };

  const dotClasses = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    harvest: 'bg-amber-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    forest: 'bg-[#14532D]',
    neutral: 'bg-slate-500',
  };

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {hasDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

/**
 * MetadataRow adheres to the Zero-Pill rule:
 * Clean, unboxed inline metadata with typographic separators (·)
 */
export const MetadataRow: React.FC<{
  items: React.ReactNode[];
  className?: string;
}> = ({ items, className = '' }) => (
  <div className={`flex items-center flex-wrap gap-2 text-xs text-slate-500 ${className}`}>
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        <span>{item}</span>
        {idx < items.length - 1 && (
          <span className="text-slate-300 select-none" aria-hidden="true">
            ·
          </span>
        )}
      </React.Fragment>
    ))}
  </div>
);
