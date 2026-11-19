import React from 'react';
import { PieChart } from 'lucide-react';
import { Card } from '../../../design-system/components/Card';

export const FarmInsights: React.FC = () => (
  <Card padding="md" className="border-slate-200 bg-white shadow-xs">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#14532D]">
        <PieChart className="h-4 w-4 text-[#16A34A]" />
      </div>
      <div>
        <h3 className="text-base font-bold tracking-tight text-slate-900">Farm Insights</h3>
        <p className="text-xs text-slate-500">
          Add farm records to see insights.
        </p>
      </div>
    </div>
  </Card>
);
