import React from 'react';
import { Home, Sprout, Milk, TrendingUp, UserCheck } from 'lucide-react';

export interface AgroLinkMobileNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const AgroLinkMobileNav: React.FC<AgroLinkMobileNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'crops', label: 'Crops', icon: Sprout },
    { id: 'livestock', label: 'Dairy', icon: Milk },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'advisory', label: 'Experts', icon: UserCheck },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer transition-colors relative select-none ${
                isActive ? 'text-[#16A34A]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] tracking-tight mt-1 font-medium ${
                  isActive ? 'font-semibold text-[#14532D]' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#16A34A]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
