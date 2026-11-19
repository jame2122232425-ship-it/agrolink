import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  description,
  actionText,
  onAction,
  onDismiss,
  className = '',
}) => {
  const variantStyles = {
    info: {
      container: 'bg-blue-50/80 border-blue-200/80 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-blue-700 hover:text-blue-900 underline font-semibold',
    },
    success: {
      container: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-emerald-700 hover:text-emerald-900 underline font-semibold',
    },
    warning: {
      container: 'bg-amber-50/90 border-amber-300/80 text-amber-950',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-amber-800 hover:text-amber-950 underline font-semibold',
    },
    error: {
      container: 'bg-red-50/80 border-red-200/80 text-red-950',
      icon: <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-red-700 hover:text-red-900 underline font-semibold',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 p-4 rounded-xl border text-sm transition-all duration-150 ${style.container} ${className}`}
    >
      {style.icon}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="font-semibold text-sm leading-tight text-inherit">{title}</h4>
        {description && (
          <div className="mt-1 text-xs opacity-90 leading-relaxed text-inherit">
            {description}
          </div>
        )}
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`mt-2 text-xs inline-block cursor-pointer ${style.actionBtn}`}
          >
            {actionText}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="p-1 -mr-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
