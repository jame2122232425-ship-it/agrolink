import React from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { FarmerCollection, useFarmer } from '../../context/FarmerContext';

const DEFAULT_LABELS: Record<FarmerCollection, string> = {
  plots: 'farm plots',
  crops: 'crop records',
  livestock: 'livestock records',
  animals: 'animal records',
  vaccinations: 'vaccination records',
  reports: 'reports',
  activities: 'activity ledger',
  alerts: 'alerts',
};

interface DataStateBannerProps {
  collection: FarmerCollection;
  label?: string;
  className?: string;
}

export const DataStateBanner: React.FC<DataStateBannerProps> = ({
  collection,
  label,
  className = '',
}) => {
  const { dataStatus, retry } = useFarmer();
  const state = dataStatus[collection];
  const target = label ?? DEFAULT_LABELS[collection];

  if (!state || (!state.loading && !state.error)) {
    return null;
  }

  if (state.error) {
    return (
      <div
        role="alert"
        className={`flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 sm:flex-row sm:items-center sm:justify-between ${className}`}
      >
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>
            <strong className="block">Could not load {target}</strong>
            <span className="text-red-700">{state.error}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => void retry(collection)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 ${className}`}
    >
      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
      Refreshing {target}…
    </div>
  );
};

interface CollectionSkeletonProps {
  rows?: number;
}

export const CollectionSkeleton: React.FC<CollectionSkeletonProps> = ({ rows = 3 }) => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
      />
    ))}
  </div>
);
