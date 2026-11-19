import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'cream' | 'soft' | 'forest';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isInteractive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  isInteractive = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200';

  const variantClasses = {
    // Pure White surface with subtle 1px hairline border
    default: 'bg-white border border-slate-200/80 shadow-[0_3px_12px_rgba(18,54,33,0.035)] text-slate-800',
    // Warm Cream sparingly used for agricultural warmth
    cream: 'bg-[#FBFBF5] border border-[#E9E9D5] text-slate-800 shadow-[0_3px_12px_rgba(18,54,33,0.025)]',
    // Soft neutral canvas
    soft: 'bg-[#F8FAFC] border border-slate-200/70 text-slate-800',
    // Deep Forest Green for hero or standout status
    forest: 'bg-[#0F5132] border border-[#176641] text-white shadow-md',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const interactiveClasses = isInteractive
    ? 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_9px_25px_rgba(20,83,45,0.09)] active:translate-y-0 active:scale-[0.99]'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`flex items-start justify-between gap-4 mb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base sm:text-lg font-semibold text-slate-900 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardSubtitle: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-slate-500 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => <div className={`${className}`} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 ${className}`} {...props}>
    {children}
  </div>
);
