import React from 'react';
import { Sprout } from 'lucide-react';
import { WelcomeSection } from './components/WelcomeSection';
import { FarmOverviewCards } from './components/FarmOverviewCards';
import { QuickActions } from './components/QuickActions';
import { FarmAlerts } from './components/FarmAlerts';
import { CropSummary } from './components/CropSummary';
import { LivestockSummary } from './components/LivestockSummary';
import { AIAssistantCard } from './components/AIAssistantCard';
import { RecentActivity } from './components/RecentActivity';
import { MarketHighlights } from './components/MarketHighlights';
import { FarmInsights } from './components/FarmInsights';
import { DataStateBanner } from '../../components/common/DataStateBanner';
import { useFarmer } from '../../context/FarmerContext';

export const DashboardPage: React.FC = () => {
  const { farmer, farms, farmsLoading } = useFarmer();

  if (farmsLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#14532D]">
          <Sprout className="h-7 w-7 animate-pulse" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">Loading your farm dashboard…</p>
      </section>
    );
  }

  if (farms.length === 0) {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#14532D]">
          <Sprout className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#16A34A]">
          AgroLink account ready
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900">
          Welcome{farmer.preferredName ? `, ${farmer.preferredName}` : ''}.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Add a farm to start tracking crops, livestock, and activity.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-7 lg:space-y-8 animate-in fade-in duration-200 motion-reduce:animate-none">
      {/* 1. Welcome and Farm Profile Section */}
      <WelcomeSection />

      <div className="space-y-2">
        <DataStateBanner collection="crops" />
        <DataStateBanner collection="livestock" />
        <DataStateBanner collection="reports" />
        <DataStateBanner collection="activities" />
      </div>

      {/* 2. Farm Overview Metric Cards */}
      <FarmOverviewCards />

      {/* 3. Essential Quick Actions Bar */}
      <QuickActions />

      {/* 4. Prominent Farm Alerts Section */}
      <FarmAlerts />

      {/* 5. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 items-start">
        {/* Main dashboard content */}
        <div className="xl:col-span-2 space-y-5 sm:space-y-7 lg:space-y-8">
          {/* Crop Management Summary ("My Crops") */}
          <CropSummary />

          {/* Livestock Summary ("My Livestock") */}
          <LivestockSummary />

          {/* AI Agricultural Assistant Feature Card */}
          <AIAssistantCard />

          {/* Farm Insights Visual Indicators */}
          <FarmInsights />
        </div>

        {/* Supporting information column */}
        <div className="space-y-5 sm:space-y-7 lg:space-y-8">
          {/* Recent Farm Activity Timeline */}
          <RecentActivity />

          {/* Agricultural Market & Economic Opportunities */}
          <MarketHighlights />
        </div>
      </div>
    </div>
  );
};
