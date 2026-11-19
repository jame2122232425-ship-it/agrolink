import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  Globe,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { FarmerAvatar } from '../common/FarmerAvatar';
import { Badge } from '../../design-system/components/Badge';
import { apiService } from '../../services/apiService';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

interface GlobalSearchResult {
  id: string;
  title: string;
  category: string;
  description: string;
  route: string;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    farmer,
    activeFarm,
    farms,
    plots,
    crops,
    livestock,
    animals,
    reports,
    activities,
    alerts,
    unreadAlertsCount,
    refreshAlerts,
    markAlertAsRead,
    markAllAlertsAsRead,
    searchQuery,
    setSearchQuery,
    language,
    toggleLanguage,
    showToast,
  } = useFarmer();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  useEffect(() => {
    if (notificationsOpen) {
      void refreshAlerts();
    }
  }, [notificationsOpen, refreshAlerts]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const terms = query.split(/\s+/);
    const matches = (values: Array<string | number | undefined>) => {
      const searchableText = values.filter((value) => value !== undefined).join(' ').toLowerCase();
      return terms.every((term) => searchableText.includes(term));
    };

    const results: GlobalSearchResult[] = [
      ...farms
        .filter((farm) =>
          matches([
            farm.name,
            farm.location,
            farm.county,
            farm.subCounty,
            farm.primaryEnterprise,
            farm.totalAcres,
          ]),
        )
        .map((farm) => ({
          id: `farm-${farm.id}`,
          title: farm.name,
          category: 'Farm',
          description: [farm.location, farm.county, `${farm.totalAcres} acres`]
            .filter(Boolean)
            .join(' · '),
          route: `/farmdetail/${farm.id}`,
        })),
      ...plots
        .filter((plot) =>
          matches([
            plot.name,
            plot.plotNumber,
            plot.currentCrop,
            plot.variety,
            plot.soilCondition,
            plot.irrigation,
            plot.notes,
          ]),
        )
        .map((plot) => ({
          id: `plot-${plot.id}`,
          title: plot.name,
          category: 'Plot',
          description: `${plot.plotNumber} · ${plot.currentCrop} · ${plot.acres} acres`,
          route: `/farmdetail/${plot.farmId}`,
        })),
      ...crops
        .filter((crop) =>
          matches([
            crop.name,
            crop.variety,
            crop.plotName,
            crop.growthStage,
            crop.healthStatus,
            crop.expectedHarvest,
          ]),
        )
        .map((crop) => ({
          id: `crop-${crop.id}`,
          title: crop.name,
          category: 'Crop',
          description: `${crop.variety} · ${crop.plotName}`,
          route: '/crops',
        })),
      ...livestock
        .filter((group) => matches([group.category, group.subType, group.breed, group.feedingNotes]))
        .map((group) => ({
          id: `livestock-${group.id}`,
          title: group.category,
          category: 'Livestock',
          description: `${group.subType} · ${group.count} animals`,
          route: '/livestock',
        })),
      ...animals
        .filter((animal) =>
          matches([animal.name, animal.tagNumber, animal.breed, animal.category, animal.notes]),
        )
        .map((animal) => ({
          id: `animal-${animal.id}`,
          title: animal.name || animal.tagNumber,
          category: 'Animal',
          description: `${animal.category} · ${animal.breed} · Tag ${animal.tagNumber}`,
          route: '/livestock',
        })),
      ...reports
        .filter((report) =>
          matches([
            report.ticketNumber,
            report.title,
            report.category,
            report.description,
            report.affectedItem,
            report.plotOrLocation,
            report.status,
          ]),
        )
        .map((report) => ({
          id: `report-${report.id}`,
          title: report.title,
          category: 'Report',
          description: `#${report.ticketNumber} · ${report.status}`,
          route: '/report-problem',
        })),
      ...activities
        .filter((activity) =>
          matches([activity.title, activity.detail, activity.plotOrUnit, activity.category]),
        )
        .map((activity) => ({
          id: `activity-${activity.id}`,
          title: activity.title,
          category: 'Activity',
          description: `${activity.plotOrUnit} · ${activity.detail}`,
          route: '/activity',
        })),
      ...alerts
        .filter((alert) => matches([alert.title, alert.description, alert.suggestedAction]))
        .map((alert) => ({
          id: `alert-${alert.id}`,
          title: alert.title,
          category: 'Alert',
          description: alert.description,
          route: alert.actionRoute || '/weather',
        })),
    ];

    const pageShortcuts = [
      {
        id: 'page-farms',
        title: 'All farms',
        category: 'Page',
        description: 'View every farm registered to your account',
        route: '/farm',
        keywords: ['farm', 'farms', 'property', 'properties'],
      },
      {
        id: 'page-crops',
        title: 'Crop Management',
        category: 'Page',
        description: 'View crop records, varieties, and plots',
        route: '/crops',
        keywords: ['crop', 'crops', 'maize', 'beans', 'tomato', 'seed', 'seeds', 'variety'],
      },
      {
        id: 'page-livestock',
        title: 'Livestock & Dairy',
        category: 'Page',
        description: 'View livestock and animal records',
        route: '/livestock',
        keywords: ['livestock', 'animal', 'animals', 'cattle', 'cow', 'goat', 'sheep', 'poultry', 'dairy', 'herd'],
      },
      {
        id: 'page-reports',
        title: 'Field Reports',
        category: 'Page',
        description: 'View submitted farm and soil reports',
        route: '/report-problem',
        keywords: ['report', 'reports', 'soil', 'disease', 'pest', 'issue', 'problem'],
      },
      {
        id: 'page-activity',
        title: 'Farm Activity',
        category: 'Page',
        description: 'Review recent farm records and activity',
        route: '/activity',
        keywords: ['activity', 'activities', 'history', 'record', 'records'],
      },
      {
        id: 'page-experts',
        title: 'Expert Services',
        category: 'Page',
        description: 'Find agricultural and veterinary professionals',
        route: '/experts',
        keywords: ['expert', 'experts', 'vet', 'veterinary', 'agronomist'],
      },
      {
        id: 'page-market-trends',
        title: 'Market Trends',
        category: 'Page',
        description: 'Compare current crop and livestock prices across counties',
        route: '/market-trends',
        keywords: ['market trends', 'prices', 'county prices', 'commodity prices'],
      },
      {
        id: 'page-marketplace',
        title: 'Marketplace',
        category: 'Page',
        description: 'Browse market rates, buyers, and suppliers',
        route: '/marketplace',
        keywords: ['market', 'markets', 'rate', 'rates', 'buyer', 'buyers', 'supplier', 'suppliers'],
      },
      {
        id: 'page-weather',
        title: 'Weather & Alerts',
        category: 'Page',
        description: 'View local forecasts and farm alerts',
        route: '/weather',
        keywords: ['weather', 'rain', 'forecast', 'alert', 'alerts'],
      },
    ];

    const shortcuts: GlobalSearchResult[] = pageShortcuts
      .filter((page) => terms.some((term) => page.keywords.some((keyword) => keyword.includes(term))))
      .map(({ keywords: _keywords, ...page }) => page);

    return [...results, ...shortcuts].slice(0, 8);
  }, [activities, alerts, animals, crops, farms, livestock, plots, reports, searchQuery]);

  const selectSearchResult = (result: GlobalSearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(result.route);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchOpen(false);
    } else if (event.key === 'ArrowDown' && searchResults.length > 0) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((index) => (index + 1) % searchResults.length);
    } else if (event.key === 'ArrowUp' && searchResults.length > 0) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSearchIndex((index) => (index - 1 + searchResults.length) % searchResults.length);
    } else if (event.key === 'Enter' && searchResults[activeSearchIndex]) {
      event.preventDefault();
      selectSearchResult(searchResults[activeSearchIndex]);
    }
  };

  // Dynamic breadcrumb/page title mapping
  const routeTitles: Record<string, { title: string; category: string }> = {
    '/dashboard': { title: 'Farmer Dashboard', category: 'Overview' },
    '/farm': { title: 'My Farms', category: 'Farm Operations' },
    '/crops': { title: 'Crop Management', category: 'Crops & Soil' },
    '/livestock': { title: 'Livestock & Dairy Hub', category: 'Herd Management' },
    '/ai-assistant': { title: 'AI Agricultural Assistant', category: 'Intelligence' },
    '/report-problem': { title: 'Report Field Problem', category: 'Diagnostics' },
    '/weather': { title: 'Weather & Climate Alerts', category: 'Micro-Climate' },
    '/marketplace': { title: 'Market & Buyers Hub', category: 'Commerce' },
    '/market-trends': { title: 'Market Trends', category: 'Market Intelligence' },
    '/experts': { title: 'Agricultural Expert Services', category: 'Advisory' },
    '/activity': { title: 'Farm Activity Ledger', category: 'History' },
    '/settings': { title: 'Farm Settings & Profile', category: 'Account' },
    '/design-system': { title: 'AgroLink Design System Workbench', category: 'Design System' },
  };

  const currentRouteInfo = routeTitles[location.pathname] || (
    location.pathname.startsWith('/farmdetail/')
      ? { title: 'Farm Details', category: 'Farm Operations' }
      : {
          title: 'Farmer Portal',
          category: 'AgroLink',
      }
  );

  return (
    <header className="sticky top-0 z-20 min-h-[68px] bg-white/90 backdrop-blur-xl border-b border-emerald-900/[.08] px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_4px_20px_rgba(22,55,35,.035)]">
      {/* Left: Mobile Menu Trigger + Breadcrumb Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-1 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>{currentRouteInfo.category}</span>
            <span>/</span>
            <span className="text-[#16A34A]">{activeFarm.name}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
            {currentRouteInfo.title}
          </h1>
        </div>
      </div>

      {/* Center: Search Interface */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
        <div
          className="relative w-full"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setSearchOpen(false);
            }
          }}
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveSearchIndex(0);
              setSearchOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
            aria-controls="global-search-results"
            aria-activedescendant={searchResults[activeSearchIndex]?.id}
            placeholder="Search farms, crops, livestock, reports"
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {searchOpen && (
            <div
              id="global-search-results"
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      id={result.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeSearchIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSearchIndex(index)}
                      onClick={() => selectSearchResult(result)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                        index === activeSearchIndex ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {result.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {result.category}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {result.description}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">
                    No results found for “{searchQuery.trim()}”.
                  </p>
                )
              ) : (
                <p className="px-3 py-4 text-center text-sm text-slate-500">
                  Search your farms, plots, crops, livestock, reports, and activities.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications, Language, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Switcher Badge Button */}
        <button
          onClick={toggleLanguage}
          title="Toggle Language (English / Kiswahili)"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#14532D] hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60"
        >
          <Globe className="w-3.5 h-3.5 text-[#16A34A]" />
          <span>{language === 'English' ? 'EN' : 'SW'}</span>
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileDropdownOpen(false);
            }}
            aria-label="Open notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    {unreadAlertsCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                        {unreadAlertsCount} unread
                      </span>
                    )}
                  </div>
                  {unreadAlertsCount > 0 && (
                    <button
                      onClick={markAllAlertsAsRead}
                      className="text-xs text-[#16A34A] hover:underline font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {alerts.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => markAlertAsRead(alt.id)}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        alt.isRead
                          ? 'bg-white border-slate-100 text-slate-600 opacity-80'
                          : 'bg-emerald-50/50 border-emerald-200 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold leading-snug">{alt.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {alt.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                        {alt.description}
                      </p>
                      {alt.actionText && alt.actionRoute && (
                        <Link
                          to={alt.actionRoute}
                          onClick={() => setNotificationsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#14532D] hover:underline"
                        >
                          <span>{alt.actionText}</span>
                          <ExternalLink className="w-3 h-3 text-[#16A34A]" />
                        </Link>
                      )}
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No notifications yet.
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-center">
                  <Link
                    to="/weather"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-[#14532D] font-bold hover:underline"
                  >
                    View weather and market updates →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Farmer Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group select-none min-h-[44px]"
          >
            <FarmerAvatar
              imageUrl={farmer.profilePictureUrl}
              initials={farmer.avatarInitials}
              className="w-8 h-8 rounded-xl bg-[#14532D] text-[#86EFAC] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-[#16A34A]"
            />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {farmer.preferredName}
              </span>
              <span className="text-[10px] text-slate-500 leading-none">
                {farmer.county}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1 text-xs">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <span className="font-bold text-slate-900 block text-sm">
                    {farmer.fullName}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] block">
                    {farmer.phoneNumber}
                  </span>
                  <span className="text-emerald-700 font-semibold text-[11px] mt-0.5 block">
                    {activeFarm.name} ({activeFarm.totalAcres} Ac)
                  </span>
                </div>

                <Link
                  to="/farm"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Farms</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account & Language</span>
                </Link>

                <Link
                  to="/design-system"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  <HelpCircle className="w-4 h-4 text-[#16A34A]" />
                  <span>Design System Workbench</span>
                </Link>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      try {
                        await apiService.logout();
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Server sign-out failed.';
                        showToast(message, 'warning');
                      } finally {
                        navigate('/');
                      }
                    }}
                    className="w-full text-left p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
