import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Trees,
  Sprout,
  Beef,
  Bot,
  AlertOctagon,
  CloudSunRain,
  ShoppingBag,
  GraduationCap,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
  TrendingUp,
  MessagesSquare,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: string | null;
  badgeAlert?: boolean;
  isAi?: boolean;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  className = '',
}) => {
  const { unreadAlertsCount, plotCount, herdCount } = useFarmer();
  const location = useLocation();

  const navigationGroups: NavGroup[] = [
    {
      groupTitle: 'Farm Operations',
      items: [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          to: '/farm',
          label: 'My Farms',
          icon: Trees,
          badge: null,
        },
        {
          to: '/crops',
          label: 'Crops',
          icon: Sprout,
          badge:
            plotCount === null
              ? null
              : `${plotCount} ${plotCount === 1 ? 'Plot' : 'Plots'}`,
        },
        {
          to: '/livestock',
          label: 'Livestock',
          icon: Beef,
          badge:
            herdCount === null
              ? null
              : `${herdCount} ${herdCount === 1 ? 'Herd' : 'Herds'}`,
        },
      ],
    },
    {
      groupTitle: 'Intelligence & Help',
      items: [
        {
          to: '/ai-assistant',
          label: 'AI Agronomist',
          icon: Bot,
          isAi: true,
          badge: 'Online',
        },
        {
          to: '/report-problem',
          label: 'Report a Problem',
          icon: AlertOctagon,
          badge: null,
        },
        {
          to: '/community',
          label: 'Farmer Community',
          icon: MessagesSquare,
          badge: null,
        },
        {
          to: '/weather',
          label: 'Weather',
          icon: CloudSunRain,
          badge: unreadAlertsCount > 0 ? `${unreadAlertsCount} New` : null,
          badgeAlert: unreadAlertsCount > 0,
        },
      ],
    },
    {
      groupTitle: 'Commerce & Experts',
      items: [
        {
          to: '/market-trends',
          label: 'Market Trends',
          icon: TrendingUp,
          badge: null,
        },
        {
          to: '/marketplace',
          label: 'Market',
          icon: ShoppingBag,
          badge: null,
        },
        {
          to: '/experts',
          label: 'Experts',
          icon: GraduationCap,
          badge: null,
        },
        {
          to: '/activity',
          label: 'My Activity',
          icon: History,
          badge: null,
        },
      ],
    },
    {
      groupTitle: 'System',
      items: [
        {
          to: '/settings',
          label: 'Settings',
          icon: Settings,
          badge: null,
        },
        {
          to: '/design-system',
          label: 'Design System',
          icon: Palette,
          badge: 'v1.0',
        },
      ],
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-gradient-to-b from-[#103d28] via-[#12452d] to-[#0d3524] text-white border-r border-emerald-950/40 flex flex-col justify-between transition-all duration-300 z-30 select-none shadow-[8px_0_30px_rgba(14,56,35,.08)] ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Top Header: Brand Lockup & Collapse Trigger */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/15 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-white/20 transition-colors">
            <Sprout className="w-5 h-5 text-[#86EFAC]" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-display text-xl font-extrabold tracking-tight text-white leading-none">
                Agro<span className="text-[#8DE0A7]">Link</span>
              </span>
              <span className="text-[10px] tracking-tight text-emerald-100/60 font-medium mt-0.5">
                Farmer Intelligence
              </span>
            </div>
          )}
        </NavLink>

        {/* Desktop Collapse Toggle Button */}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex p-1.5 rounded-lg text-emerald-100/60 hover:text-white hover:bg-white/10 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed ? (
              <span className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-100/45 px-3 py-1 block">
                {group.groupTitle}
              </span>
            ) : (
              <div className="border-t border-white/10 my-2 mx-1" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isFarmDetail = item.to === '/farm' && location.pathname.startsWith('/farmdetail');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all relative ${
                      isActive || isFarmDetail
                        ? 'bg-white/15 text-white shadow-xs ring-1 ring-white/10'
                        : 'text-emerald-50/75 hover:text-white hover:bg-white/[.08]'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`
                  }
                >
                  {({ isActive: routeIsActive }) => {
                    const isActive = routeIsActive || isFarmDetail;
                    return (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? item.isAi
                              ? 'text-[#86EFAC]'
                              : 'text-[#86EFAC]'
                            : item.isAi
                            ? 'text-[#16A34A]'
                            : 'text-emerald-100/50 group-hover:text-emerald-100'
                        }`}
                      />

                      {!isCollapsed && (
                        <>
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                                isActive
                                  ? 'bg-white/20 text-emerald-100'
                                  : item.badgeAlert
                                  ? 'bg-amber-100 text-amber-900 font-bold'
                                  : 'bg-white/10 text-emerald-50/75'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {/* Left vertical active bar for collapsed mode */}
                      {isCollapsed && isActive && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#86EFAC]"
                          aria-hidden="true"
                        />
                      )}
                    </>
                    );
                  }}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Emergency Help Link */}
      <div className="p-3 border-t border-white/10 bg-black/10">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-white/[.07] border border-white/10 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-100 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8DE0A7]" />
              <span>County Helpline: 0800-AGRO</span>
            </div>
            <p className="text-[11px] text-emerald-50/65 leading-tight">
              Free extension support by Ministry of Agriculture Kenya.
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Helpline 0800-AGRO">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
          </div>
        )}
      </div>
    </aside>
  );
};
