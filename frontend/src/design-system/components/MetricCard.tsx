import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  note?: string;
  variant?: 'default' | 'cream' | 'forest';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  trend,
  icon,
  note,
  variant = 'default',
  className = '',
}) => {
  const isForest = variant === 'forest';

  return (
    <Card
      variant={variant}
      padding="md"
      className={`relative overflow-hidden transition-all duration-200 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            isForest ? 'text-emerald-200' : 'text-slate-500'
          }`}
        >
          {label}
        </span>
        {icon && (
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isForest ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-[#16A34A]'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
            isForest ? 'text-white' : 'text-slate-900'
          }`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`text-xs sm:text-sm font-medium ${
              isForest ? 'text-emerald-200' : 'text-slate-500'
            }`}
          >
            {unit}
          </span>
        )}
      </div>

      {(trend || note) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {trend && (
            <div
              className={`inline-flex items-center gap-1 font-semibold ${
                trend.isNeutral
                  ? isForest
                    ? 'text-slate-300'
                    : 'text-slate-600'
                  : trend.isPositive
                  ? isForest
                    ? 'text-emerald-300'
                    : 'text-emerald-700'
                  : isForest
                  ? 'text-amber-300'
                  : 'text-amber-700'
              }`}
            >
              {trend.isNeutral ? (
                <Minus className="w-3.5 h-3.5" />
              ) : trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span className="tabular-nums font-mono">{trend.value}</span>
              {trend.label && (
                <span className={`font-normal ml-0.5 ${isForest ? 'text-emerald-200/70' : 'text-slate-500'}`}>
                  {trend.label}
                </span>
              )}
            </div>
          )}
          {note && (
            <span className={`text-[11px] truncate ${isForest ? 'text-emerald-200/70' : 'text-slate-500'}`}>
              {note}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
