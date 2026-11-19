import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coins } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';

export const MarketHighlights: React.FC = () => {
  return (
    <Card padding="md" className="border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Market & Economic Opportunities
            </h3>
            <p className="text-xs text-slate-500">
              Verified buyers, regional commodity rates, and county input subsidies
            </p>
          </div>
        </div>

        <Link
          to="/marketplace"
          className="min-h-11 self-start rounded-lg px-2 -ml-2 sm:ml-0 sm:-mr-2 text-sm font-bold text-[#14532D] hover:text-[#16A34A] flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          <span>Marketplace Hub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-slate-700">No market listings available</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Opportunities will appear here when the marketplace is connected.
        </p>
      </div>
    </Card>
  );
};
