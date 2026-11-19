import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  Sprout,
  LayoutDashboard,
  Trees,
  Beef,
  Bot,
  AlertOctagon,
  CloudSunRain,
  ShoppingBag,
  GraduationCap,
  History,
  Settings,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  MessagesSquare,
  MoreHorizontal,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MobileLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  isAi?: boolean;
  badge?: string | null;
  isMenu?: boolean;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { unreadAlertsCount } = useFarmer();
  const location = useLocation();

  if (!isOpen) return null;

  const links: MobileLinkItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/farm', label: 'My Farms', icon: Trees },
    { to: '/crops', label: 'Crop Management', icon: Sprout },
    { to: '/livestock', label: 'Livestock & Dairy', icon: Beef },
    { to: '/ai-assistant', label: 'AI Agricultural Assistant', icon: Bot, isAi: true },
    { to: '/report-problem', label: 'Report a Problem', icon: AlertOctagon },
    { to: '/community', label: 'Farmer Community', icon: MessagesSquare },
    {
      to: '/weather',
      label: 'Weather & Alerts',
      icon: CloudSunRain,
      badge: unreadAlertsCount > 0 ? `${unreadAlertsCount} New` : null,
    },
    { to: '/market-trends', label: 'Market Trends', icon: TrendingUp },
    { to: '/marketplace', label: 'Market & Buyers', icon: ShoppingBag },
    { to: '/experts', label: 'Expert Services', icon: GraduationCap },
    { to: '/activity', label: 'My Farm Activity', icon: History },
    { to: '/settings', label: 'Settings & Language', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#14532D] text-white flex items-center justify-center">
              <Sprout className="w-5 h-5 text-[#86EFAC]" />
            </div>
            <span className="font-display text-lg font-extrabold text-[#14532D]">
              Agro<span className="text-[#16A34A]">Link</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isFarmDetail = link.to === '/farm' && location.pathname.startsWith('/farmdetail');
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between p-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors min-h-[44px] ${
                    isActive || isFarmDetail
                      ? 'bg-[#14532D] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {({ isActive: routeIsActive }) => {
                  const isActive = routeIsActive || isFarmDetail;
                  return (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive
                            ? 'text-[#86EFAC]'
                            : link.isAi
                            ? 'text-[#16A34A]'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>{link.label}</span>
                    </div>
                    {link.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                          isActive ? 'bg-white/20 text-emerald-100' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {link.badge}
                      </span>
                    )}
                  </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-semibold text-[#14532D] mb-1">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Ministry of Agriculture Verified</span>
          </div>
          <p>Nakuru County Extension Node</p>
        </div>
      </div>
    </div>
  );
};

export const MobileBottomNav: React.FC<{ onOpenMenu: () => void }> = ({ onOpenMenu }) => {
  const bottomTabs: MobileLinkItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/crops', label: 'Crops', icon: Sprout },
    { to: '/ai-assistant', label: 'AI Help', icon: Bot, isAi: true },
    { to: '/community', label: 'Community', icon: MessagesSquare },
    { to: '#more', label: 'More', icon: MoreHorizontal, isMenu: true },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto px-1">
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          return tab.isMenu ? (
            <button
              key={tab.to}
              type="button"
              onClick={onOpenMenu}
              aria-label="Open more navigation options"
              className="flex h-full min-h-[44px] flex-col items-center justify-center text-slate-500 transition-colors hover:text-slate-800"
            >
              <Icon className="h-5 w-5" />
              <span className="mt-1 text-[10px] font-medium tracking-tight">{tab.label}</span>
            </button>
          ) : (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer transition-colors relative select-none ${
                  isActive ? 'text-[#16A34A]' : 'text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                    } ${tab.isAi && !isActive ? 'text-emerald-700' : ''}`}
                  />
                  <span
                    className={`text-[10px] tracking-tight mt-1 font-medium ${
                      isActive ? 'font-bold text-[#14532D]' : 'text-slate-500'
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
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
