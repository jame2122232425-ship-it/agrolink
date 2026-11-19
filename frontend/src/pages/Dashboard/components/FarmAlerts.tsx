import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Info,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { Card } from '../../../design-system/components/Card';
import { useFarmer } from '../../../context/FarmerContext';
import { AgriculturalAlert } from '../../../data/farmerData';

export const FarmAlerts: React.FC = () => {
  const { alerts, markAlertAsRead } = useFarmer();

  const getAlertIcon = (severity: AgriculturalAlert['severity']) => {
    switch (severity) {
      case 'danger':
        return <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
  };

  const getSeverityStyle = (severity: AgriculturalAlert['severity']) => {
    switch (severity) {
      case 'danger':
        return {
          card: 'bg-red-50/60 border-red-200/90 text-red-950',
          badge: 'bg-red-100 text-red-800 border-red-200',
          badgeLabel: 'High Priority',
          btn: 'text-red-700 hover:text-red-900 border-red-300 hover:bg-red-100/60',
        };
      case 'warning':
        return {
          card: 'bg-amber-50/60 border-amber-200/90 text-amber-950',
          badge: 'bg-amber-100 text-amber-900 border-amber-200',
          badgeLabel: 'Warning',
          btn: 'text-amber-800 hover:text-amber-950 border-amber-300 hover:bg-amber-100/60',
        };
      case 'info':
        return {
          card: 'bg-blue-50/50 border-blue-200/80 text-blue-950',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          badgeLabel: 'Advisory',
          btn: 'text-blue-800 hover:text-blue-950 border-blue-300 hover:bg-blue-100/60',
        };
      case 'success':
        return {
          card: 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          badgeLabel: 'Notice',
          btn: 'text-emerald-800 hover:text-emerald-950 border-emerald-300 hover:bg-emerald-100/60',
        };
    }
  };

  return (
    <Card padding="md" className="border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Farm Alerts & Advisories</h3>
            <p className="text-[11px] text-slate-500">
              Weather, health, and field alerts
            </p>
          </div>
        </div>

        <Link
          to="/weather"
          className="min-h-11 self-start rounded-lg px-2 -ml-2 text-sm font-bold text-[#14532D] hover:text-[#16A34A] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span>Weather Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No active alerts. New health observations, open reports, and upcoming vaccinations will appear here.
          </p>
        )}
        {alerts.map((alt) => {
          const style = getSeverityStyle(alt.severity);

          return (
            <div
              key={alt.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start justify-between gap-3 ${style.card}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getAlertIcon(alt.severity)}</div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${style.badge}`}
                    >
                      {style.badgeLabel}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {alt.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      · {alt.timeAgo}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                    {alt.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
                <Link
                  to={alt.actionRoute}
                  onClick={() => markAlertAsRead(alt.id)}
                  className={`min-h-11 px-3 rounded-xl border text-sm font-semibold bg-white shadow-2xs transition-colors flex items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700 ${style.btn}`}
                >
                  {alt.suggestedAction}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
