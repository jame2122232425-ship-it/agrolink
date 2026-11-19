import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'forest' | 'amber' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // Base classes ensure single-line whitespace-nowrap, touch ergonomics (min-height), and smooth transitions
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2', // Meets 44px mobile touch target
    lg: 'text-base px-6 py-3 min-h-[48px] gap-2.5',
  };

  const variantClasses = {
    // Primary: Lively Primary Green (#16A34A) with smooth dark forest hover
    primary:
      'bg-[#16804A] text-white hover:bg-[#11683C] shadow-sm hover:shadow-md focus-visible:ring-[#16804A]',
    // Forest: Deep Forest Green (#14532D) anchor for high-importance actions
    forest:
      'bg-[#0F5132] text-white hover:bg-[#0b3d27] shadow-sm hover:shadow-md focus-visible:ring-[#0F5132]',
    // Secondary: Clean white card surface with crisp hairline border
    secondary:
      'bg-white text-slate-800 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-sm focus-visible:ring-slate-400',
    // Amber: Harvest Amber (#F59E0B) for alerts and key harvest market actions
    amber:
      'bg-[#F59E0B] text-slate-950 font-semibold hover:bg-[#D97706] hover:text-white shadow-sm focus-visible:ring-[#F59E0B]',
    // Outline: Primary green hairline border
    outline:
      'bg-transparent text-[#16A34A] border border-[#16A34A] hover:bg-green-50/70 focus-visible:ring-[#16A34A]',
    // Ghost: Subtle flat action
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
    // Danger: Error/destructive action
    danger:
      'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm focus-visible:ring-[#DC2626]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
