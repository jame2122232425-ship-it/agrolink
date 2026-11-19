import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ArrowRight, Calendar } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';
import { useFarmer } from '../../../context/FarmerContext';

export const CropSummary: React.FC = () => {
  const { crops } = useFarmer();

  const getStatusBadge = (status: 'healthy' | 'attention' | 'observation') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Healthy
          </span>
        );
      case 'observation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Under Observation
          </span>
        );
      case 'attention':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            Needs Attention
          </span>
        );
    }
  };

  return (
    <Card padding="md" className="border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">My Crops</h3>
            <p className="text-xs text-slate-500">{crops.length} Registered Crops · Cultivated Land</p>
          </div>
        </div>

        <Link
          to="/crops"
          className="min-h-11 self-start rounded-lg px-2 -ml-2 sm:ml-0 sm:-mr-2 text-sm font-bold text-[#14532D] hover:text-[#16A34A] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span>All Crops</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {crops.length === 0 && (
          <p className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No crop cycles registered yet. Add your first crop to see health, growth stage, and harvest projections here.
          </p>
        )}
        {crops.map((crop) => (
          <div
            key={crop.id}
            className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{crop.name}</span>
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      ({crop.variety})
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {crop.plotName} · {crop.acres} Acres
                  </span>
                </div>
                {getStatusBadge(crop.healthStatus)}
              </div>

              {/* Progress bar representing stage */}
              <div className="my-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Growth: {crop.growthStage}</span>
                  <span className="font-mono tabular-nums">{crop.progressPercent}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${crop.name} growth progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={crop.progressPercent}
                  className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${crop.progressPercent}%`,
                      backgroundColor: crop.color,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Harvest: {crop.expectedHarvest}</span>
              </span>
              <span className="font-mono font-bold text-slate-900">{crop.projectedYield}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
