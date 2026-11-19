/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FarmerProvider, useFarmer } from './context/FarmerContext';
import { AppLayout } from './layouts/AppLayout';
import { apiService, SESSION_EXPIRED_EVENT } from './services/apiService';

// Application Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { FarmPage } from './pages/Farm/FarmPage';
import { FarmListPage } from './pages/Farm/FarmListPage';
import { CropsPage } from './pages/Crops/CropsPage';
import { LivestockPage } from './pages/Livestock/LivestockPage';
import { AssistantPage } from './pages/Assistant/AssistantPage';
import { ReportProblemPage } from './pages/Reports/ReportProblemPage';
import { WeatherPage } from './pages/Weather/WeatherPage';
import { MarketplacePage } from './pages/Marketplace/MarketplacePage';
import { MarketTrendsPage } from './pages/Marketplace/MarketTrendsPage';
import { ExpertsPage } from './pages/Experts/ExpertsPage';
import { CommunityPage } from './pages/Community/CommunityPage';
import { ActivityPage } from './pages/Activity/ActivityPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { DesignSystemPage } from './pages/DesignSystem/DesignSystemPage';
import { LandingPage } from './pages/Landing/LandingPage';
import { AuthPage } from './pages/Auth/AuthPage';

const AuthenticatedLayout: React.FC = () => {
  const location = useLocation();
  const [, setSessionRevision] = React.useState(0);

  React.useEffect(() => {
    const handleSessionExpired = () => {
      setSessionRevision((revision) => revision + 1);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  if (!apiService.getAccessToken()) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <AppLayout />;
};

const FarmDetailRedirect: React.FC = () => {
  const { activeFarm, farmsLoading } = useFarmer();
  if (farmsLoading) {
    return (
      <div className="p-8 text-center text-sm text-slate-600">
        Loading your farms...
      </div>
    );
  }
  return activeFarm.id
    ? <Navigate to={`/farmdetail/${activeFarm.id}`} replace />
    : <Navigate to="/farm" replace />;
};

export default function App() {
  return (
    <FarmerProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/*" element={<AuthenticatedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="farm" element={<FarmListPage />} />
            <Route path="farmdetail" element={<FarmDetailRedirect />} />
            <Route path="farmdetail/:farmId" element={<FarmPage />} />
            <Route path="crops" element={<CropsPage />} />
            <Route path="livestock" element={<LivestockPage />} />
            <Route path="ai-assistant" element={<AssistantPage />} />
            <Route path="report-problem" element={<ReportProblemPage />} />
            <Route path="weather" element={<WeatherPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="market-trends" element={<MarketTrendsPage />} />
            <Route path="experts" element={<ExpertsPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="community/:postId" element={<CommunityPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="design-system" element={<DesignSystemPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FarmerProvider>
  );
}
