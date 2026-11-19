import React from 'react';
import { Search } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefixText?: string;
  suffixText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      prefixText,
      suffixText,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const hasError = Boolean(errorText);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          {prefixText && (
            <span className="inline-flex items-center pl-3.5 pr-1.5 text-xs font-semibold text-slate-500 select-none bg-transparent">
              {prefixText}
            </span>
          )}
          <input
            id={generatedId}
            ref={ref}
            disabled={disabled}
            className={`w-full min-h-[44px] bg-white text-slate-900 text-sm rounded-xl border transition-all duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-10' : prefixText ? 'pl-1' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : suffixText ? 'pr-12' : 'pr-3.5'} ${
              hasError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-[#16804A] focus:ring-[#16804A]/15'
            } ${className}`}
            {...props}
          />
          {suffixText && (
            <span className="absolute right-3.5 text-xs font-medium text-slate-500 pointer-events-none select-none">
              {suffixText}
            </span>
          )}
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {hasError ? (
          <p className="mt-1 text-xs text-red-600 font-medium">{errorText}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const SearchInput: React.FC<
  Omit<InputProps, 'leftIcon'> & { onSearch?: (value: string) => void }
> = ({ placeholder = 'Search crops, markets, soil tests, pests...', ...props }) => (
  <Input
    leftIcon={<Search className="w-4 h-4" />}
    placeholder={placeholder}
    type="search"
    {...props}
  />
);
