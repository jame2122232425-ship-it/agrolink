import React from 'react';
import { Link } from 'react-router-dom';
import { Beef, ArrowRight, Activity, Calendar, Egg } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';
import { useFarmer } from '../../../context/FarmerContext';

export const LivestockSummary: React.FC = () => {
  const { livestock } = useFarmer();
  const totalAnimals = livestock.reduce((total, item) => total + item.count, 0);

  return (
    <Card padding="md" className="border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#14532D] flex items-center justify-center shrink-0">
            <Beef className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">My Livestock</h3>
            <p className="text-xs text-slate-500">
              {totalAnimals} Total Animals · {livestock.length} Categories
            </p>
          </div>
        </div>

        <Link
          to="/livestock"
          className="min-h-11 self-start rounded-lg px-2 -ml-2 sm:ml-0 sm:-mr-2 text-sm font-bold text-[#14532D] hover:text-[#16A34A] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span>All Livestock</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {livestock.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No livestock records yet.
          </p>
        ) : livestock.map((item) => {
          const isAttention = item.healthStatus === 'attention';

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isAttention
                  ? 'bg-amber-50/40 border-amber-200/90'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isAttention ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-[#14532D]'
                    }`}
                  >
                    {item.category.includes('Poultry') ? (
                      <Egg className="w-4 h-4" />
                    ) : item.category.includes('Goat') ? (
                      <Activity className="w-4 h-4" />
                    ) : (
                      <Beef className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {item.category}
                    </h4>
                    <span className="text-[11px] text-slate-500">{item.subType}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {item.count} Head
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      isAttention
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isAttention ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}
                    />
                    {isAttention ? 'Vaccine Due' : 'Healthy'}
                  </span>
                </div>
              </div>

              {/* Detail row */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  Daily Yield: <strong className="text-slate-900">{item.dailyOutput}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className={item.upcomingActivity.isUrgent ? 'text-amber-800 font-bold' : ''}>
                    {item.upcomingActivity.title} ({item.upcomingActivity.date})
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
