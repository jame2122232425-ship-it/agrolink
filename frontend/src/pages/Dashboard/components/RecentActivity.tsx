import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Sprout, Beef, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';
import { useFarmer } from '../../../context/FarmerContext';

export const RecentActivity: React.FC = () => {
  const { activities } = useFarmer();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dairy':
        return <Beef className="w-4 h-4 text-[#14532D]" />;
      case 'crop':
        return <Sprout className="w-4 h-4 text-[#16A34A]" />;
      case 'report':
        return <FileText className="w-4 h-4 text-amber-700" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <Card padding="md" className="border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Farm Activity</h3>
            <p className="text-xs text-slate-500">Latest farm records</p>
          </div>
        </div>

        <Link
          to="/activity"
          className="min-h-11 self-start rounded-lg px-2 -ml-2 sm:ml-0 sm:-mr-2 text-sm font-bold text-[#14532D] hover:text-[#16A34A] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {activities.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            No farm activity recorded yet. Crop, livestock, report, and farm-note events will appear here.
          </p>
        )}
        {activities.slice(0, 5).map((act) => (
          <div key={act.id} className="relative pl-4">
            {/* Timeline node */}
            <div className="absolute -left-3.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-[#16A34A] shadow-2xs" />

            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-slate-100">
                    {getCategoryIcon(act.category)}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{act.title}</h4>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                  {act.timeAgo}
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed pl-6">{act.detail}</p>

              <div className="flex items-center gap-2 pl-6 pt-0.5 text-xs text-slate-500 font-medium">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {act.plotOrUnit}
                </span>
                <span>·</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                  Verified in Ledger
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
