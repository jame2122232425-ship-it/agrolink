import React from 'react';
import { Trees, Sprout, Beef, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../design-system/components/Card';
import { useFarmer } from '../../../context/FarmerContext';

export const FarmOverviewCards: React.FC = () => {
  const { farms, totalFarmAcres, unreadAlertsCount, crops, livestock, reports, plots } = useFarmer();

  const totalLivestock = livestock.reduce((acc, curr) => acc + curr.count, 0);
  const pendingReports = reports.filter((r) => r.status !== 'Resolved').length;

  const cards = [
    {
      label: 'Total Farm Land',
      value: totalFarmAcres.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      unit: 'Acres',
      subtext: `${farms.length} ${farms.length === 1 ? 'farm' : 'farms'} · ${plots.length} plots`,
      icon: Trees,
      color: 'emerald',
      to: '/farm',
      barPercent: plots.length ? 100 : 0,
    },
    {
      label: 'Active Crops',
      value: `${crops.length}`,
      unit: 'Crops',
      subtext: crops.length ? crops.slice(0, 3).map((c) => c.name).join(', ') : 'No crop records yet',
      icon: Sprout,
      color: 'emerald',
      to: '/crops',
      barPercent: crops.length ? 100 : 0,
    },
    {
      label: 'Livestock Animals',
      value: `${totalLivestock}`,
      unit: 'Head',
      subtext: livestock.length
        ? livestock.map((group) => group.category).join(', ')
        : 'No livestock records yet',
      icon: Beef,
      color: 'forest',
      to: '/livestock',
      barPercent: livestock.length ? 100 : 0,
    },
    {
      label: 'Pending Field Reports',
      value: `${pendingReports}`,
      unit: 'Active',
      subtext: pendingReports ? 'Reports awaiting follow-up' : 'No pending reports',
      icon: FileText,
      color: 'amber',
      to: '/report-problem',
      barPercent: 30,
    },
    {
      label: 'Important Farm Alerts',
      value: `${unreadAlertsCount}`,
      unit: 'Active',
      subtext: unreadAlertsCount ? 'Review your active alerts' : 'No active alerts',
      icon: AlertTriangle,
      color: unreadAlertsCount > 0 ? 'red' : 'emerald',
      to: '/weather',
      barPercent: unreadAlertsCount > 0 ? 80 : 0,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
          Farm Health & Operations Overview
        </h2>
        <span className="hidden sm:block text-xs text-slate-500 font-medium">Real-time Telemetry</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const isAlert = c.color === 'red';
          const isAmber = c.color === 'amber';

          return (
            <Link
              key={c.label}
              to={c.to}
              className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <Card
                padding="sm"
                className={`h-full bg-white border transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${
                  isAlert
                    ? 'border-red-200 hover:border-red-400'
                    : isAmber
                    ? 'border-amber-200 hover:border-amber-400'
                    : 'border-slate-200/90 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="min-w-0 text-xs font-semibold leading-snug text-slate-600">
                    {c.label}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isAlert
                        ? 'bg-red-50 text-red-600'
                        : isAmber
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-[#16A34A]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                    {c.value}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{c.unit}</span>
                </div>

                {/* Progress bar indicator */}
                <div aria-hidden="true" className="w-full bg-slate-100 rounded-full h-1.5 my-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAlert
                        ? 'bg-red-500'
                        : isAmber
                        ? 'bg-amber-500'
                        : 'bg-[#16A34A]'
                    }`}
                    style={{ width: `${c.barPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span className="min-h-8 line-clamp-2 leading-snug">{c.subtext}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
