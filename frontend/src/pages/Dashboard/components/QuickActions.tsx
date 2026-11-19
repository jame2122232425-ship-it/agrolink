import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Beef, AlertOctagon, Bot, GraduationCap, ShoppingBag } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      to: '/crops',
      label: 'Add Crop Record',
      icon: Sprout,
      color: 'hover:border-emerald-300',
      iconColor: 'text-[#16A34A]',
    },
    {
      to: '/livestock',
      label: 'Log Livestock Milk',
      icon: Beef,
      color: 'hover:border-emerald-300',
      iconColor: 'text-[#14532D]',
    },
    {
      to: '/report-problem',
      label: 'Report Field Issue',
      icon: AlertOctagon,
      color: 'hover:border-red-300',
      iconColor: 'text-red-600',
    },
    {
      to: '/ai-assistant',
      label: 'Ask AI Agronomist',
      icon: Bot,
      color: 'hover:border-emerald-400',
      iconColor: 'text-[#16A34A]',
      isAi: true,
    },
    {
      to: '/experts',
      label: 'Find Extension Expert',
      icon: GraduationCap,
      color: 'hover:border-emerald-300',
      iconColor: 'text-[#14532D]',
    },
    {
      to: '/marketplace',
      label: 'Marketplace Bids',
      icon: ShoppingBag,
      color: 'hover:border-amber-300',
      iconColor: 'text-[#F59E0B]',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600">
          Essential Quick Actions
        </h2>
        <span className="text-[11px] text-slate-400">One-tap workflows</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.to}
              to={act.to}
              className={`w-full min-h-14 p-3 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-sm text-left transition-all duration-150 flex items-center gap-2.5 group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${act.color}`}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors">
                <Icon className={`w-4 h-4 ${act.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900 block leading-snug">
                  {act.label}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {act.isAi ? 'Instant Triage' : 'Open Module'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
