import React, { useState } from 'react';
import {
  Sprout,
  Send,
  Calendar,
  CloudRain,
  Phone,
  CheckCircle,
  AlertTriangle,
  Flame,
  Search,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent } from '../../design-system/components/Card';
import { Badge, MetadataRow } from '../../design-system/components/Badge';
import { Input, SearchInput } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Alert } from '../../design-system/components/Alert';
import { Modal } from '../../design-system/components/Modal';
import { MetricCard } from '../../design-system/components/MetricCard';
import { Tabs } from '../../design-system/components/Tabs';
import { EmptyState, Skeleton } from '../../design-system/components/EmptyState';

export const ComponentPlayground: React.FC = () => {
  // Playground state controls
  const [btnLoading, setBtnLoading] = useState(false);
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [showErrorInputs, setShowErrorInputs] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Input states
  const [farmName, setFarmName] = useState('Keringet Dairy & Tea Estate');
  const [farmerPhone, setFarmerPhone] = useState('712 345 678');
  const [expectedYieldKES, setExpectedYieldKES] = useState('145,000');
  const [selectedCounty, setSelectedCounty] = useState('nakuru');

  const counties = [
    { value: 'nakuru', label: 'Nakuru County (Dairy & Maize)' },
    { value: 'uasin_gishu', label: 'Uasin Gishu County (Granary / Wheat & Maize)' },
    { value: 'kiambu', label: 'Kiambu County (Coffee & Horticulture)' },
    { value: 'kirinyaga', label: 'Kirinyaga County (Tea & Rice - Mwea)' },
    { value: 'trans_nzoia', label: 'Trans Nzoia County (Seed Maize)' },
    { value: 'meru', label: 'Meru County (Miraa, Potatoes & Bananas)' },
    { value: 'kisumu', label: 'Kisumu County (Sugarcane & Fisheries)' },
  ];

  return (
    <div className="space-y-12">
      {/* Introduction */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
          Interactive UI Component Library
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Production-ready, accessible React components crafted with Tailwind CSS for Kenyan
          farmers. Test variants, states, and touch interactions directly.
        </p>
      </div>

      {/* 1. BUTTONS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">1. Button Components</h3>
            <p className="text-xs text-slate-500">
              Meets 44px minimum touch target on mobile devices with tactile active state feedback.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={btnLoading}
                onChange={(e) => setBtnLoading(e.target.checked)}
                className="rounded text-[#16A34A] focus:ring-[#16A34A]"
              />
              Simulate Loading
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={btnDisabled}
                onChange={(e) => setBtnDisabled(e.target.checked)}
                className="rounded text-[#16A34A] focus:ring-[#16A34A]"
              />
              Disabled
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          {/* Variants row */}
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-3 uppercase tracking-wider">
              Brand Variants
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                isLoading={btnLoading}
                disabled={btnDisabled}
                leftIcon={<Sprout className="w-4 h-4" />}
              >
                Primary Green (#16A34A)
              </Button>

              <Button
                variant="forest"
                isLoading={btnLoading}
                disabled={btnDisabled}
              >
                Deep Forest Green (#14532D)
              </Button>

              <Button
                variant="amber"
                isLoading={btnLoading}
                disabled={btnDisabled}
                leftIcon={<Flame className="w-4 h-4" />}
              >
                Harvest Amber (#F59E0B)
              </Button>

              <Button
                variant="secondary"
                isLoading={btnLoading}
                disabled={btnDisabled}
              >
                Secondary Card
              </Button>

              <Button
                variant="outline"
                isLoading={btnLoading}
                disabled={btnDisabled}
              >
                Outline Green
              </Button>

              <Button
                variant="ghost"
                isLoading={btnLoading}
                disabled={btnDisabled}
              >
                Ghost
              </Button>

              <Button
                variant="danger"
                isLoading={btnLoading}
                disabled={btnDisabled}
              >
                Destructive Alert
              </Button>
            </div>
          </div>

          {/* Sizes row */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block mb-3 uppercase tracking-wider">
              Touch Sizes (Mobile Ergonomics)
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm">
                  Small (36px)
                </Button>
                <span className="text-[11px] text-slate-400">Desktop compact</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="md">
                  Medium (44px Hitbox)
                </Button>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Recommended Mobile Default
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="lg">
                  Large (48px Primary CTA)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FORM & INPUT CONTROLS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">2. Form & Data Entry Controls</h3>
            <p className="text-xs text-slate-500">
              Equipped with Kenyan context defaults: +254 M-Pesa phone prefixes and KES currency masks.
            </p>
          </div>
          <button
            onClick={() => setShowErrorInputs(!showErrorInputs)}
            className="text-xs text-[#16A34A] hover:underline font-semibold cursor-pointer"
          >
            {showErrorInputs ? 'Hide Error Validation' : 'Toggle Error Validation'}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Farm or Cooperative Name"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            helperText="Registered business or smallholder title"
            errorText={showErrorInputs ? 'Please provide a valid farm name' : undefined}
          />

          <Input
            label="Mobile Phone (SMS & M-Pesa Notifications)"
            value={farmerPhone}
            onChange={(e) => setFarmerPhone(e.target.value)}
            prefixText="+254"
            placeholder="7XX XXX XXX"
            helperText="Used for daily rainfall and market price alerts"
            errorText={showErrorInputs ? 'Enter a 9-digit Kenyan phone number' : undefined}
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Expected Harvest Value"
            value={expectedYieldKES}
            onChange={(e) => setExpectedYieldKES(e.target.value)}
            prefixText="KES"
            suffixText="Per Season"
            helperText="Estimated market revenue from current crop cycle"
          />

          <Select
            label="Kenyan Agricultural County"
            value={selectedCounty}
            onChange={(e) => setSelectedCounty(e.target.value)}
            options={counties}
            helperText="Customizes soil type and extension officer routing"
          />

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Live Search Field
            </label>
            <SearchInput placeholder="Search maize seeds (H614), soil test reports, fertilizer stockists..." />
          </div>
        </div>
      </section>

      {/* 3. BADGES & METADATA */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">3. Status Indicators & Badges</h3>
          <p className="text-xs text-slate-500">
            High-contrast badges with paired text labels (never hue alone) and zero-pill metadata.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-semibold text-slate-500 block mb-3 uppercase tracking-wider">
              Semantic Status Badges
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success" hasDot>
                Optimal Soil Moisture (48%)
              </Badge>
              <Badge variant="harvest" hasDot>
                Maize Harvest Ready
              </Badge>
              <Badge variant="warning" hasDot>
                Rain Shortfall Warning
              </Badge>
              <Badge variant="error" hasDot>
                Pest Infestation Alert
              </Badge>
              <Badge variant="info" hasDot>
                New Market Price Available
              </Badge>
              <Badge variant="forest">
                KALRO Certified
              </Badge>
              <Badge variant="neutral">
                Pending Verification
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block mb-2 uppercase tracking-wider">
              Zero-Pill Metadata Example
            </span>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
              <MetadataRow
                items={[
                  'Maize Plot C',
                  'Planted March 14, 2026',
                  'Expected Harvest: June 2026',
                  'Rainfall: 142mm to date',
                  'Assigned Officer: Dr. Waweru',
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. ALERTS & NOTIFICATIONS */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">4. Agricultural Alert Banners</h3>
          <p className="text-xs text-slate-500">
            Urgent warnings using Harvest Amber (#F59E0B) and success confirmations.
          </p>
        </div>

        <div className="space-y-3">
          <Alert
            variant="warning"
            title="Weather Alert: Heavy Highland Rains Expected in Kirinyaga & Nyeri"
            description="Kenya Meteorological Department forecasts 60–90mm rainfall in the next 48 hours. Ensure field drainage channels are cleared to prevent root rot in potato and tea plots."
            actionText="View Drainage Preparation Checklist"
            onAction={() => alert('Opening drainage checklist')}
          />

          <Alert
            variant="success"
            title="Soil Test Verified: Nitrogen & Phosphorus Balanced"
            description="Your recent soil core sample from Block 2 has been analyzed. Soil pH is at an optimal 6.3. Fertilizer requirements reduced by 15%."
            actionText="Download Official Lab Report"
            onAction={() => alert('Downloading lab report')}
          />

          <Alert
            variant="info"
            title="Wakulima Market Spike: Dry Maize +12% this Morning"
            description="Nairobi wholesale buyers are offering KES 4,850 per 90kg bag, up from KES 4,300 last Tuesday. Demand is high."
            actionText="View Buyer Contact List"
            onAction={() => alert('Viewing buyers')}
          />
        </div>
      </section>

      {/* 5. METRIC & KPI CARDS */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">5. Farmer Metric Cards</h3>
          <p className="text-xs text-slate-500">
            Tabular figures (`tabular-nums font-mono`) preventing jitter, with trend comparisons.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Maize Wholesale Price"
            value="4,850"
            unit="KES / 90kg bag"
            trend={{ value: '+12.5%', isPositive: true, label: 'Wakulima Market' }}
            icon={<TrendingUp className="w-5 h-5" />}
            note="Updated 25m ago"
          />

          <MetricCard
            label="Daily Milk Volume"
            value="24.8"
            unit="Liters / Cow"
            trend={{ value: '+3.2%', isPositive: true, label: 'vs last week' }}
            icon={<Sprout className="w-5 h-5" />}
            note="Nakuru Dairy Co-op"
          />

          <MetricCard
            label="Soil Moisture Index"
            value="44.2"
            unit="%"
            trend={{ value: '-2.4%', isPositive: false, label: 'Drying trend' }}
            icon={<CloudRain className="w-5 h-5" />}
            note="Sensors in Plot B"
          />

          <MetricCard
            variant="forest"
            label="Seasonal Net Yield Forecast"
            value="380,000"
            unit="KES"
            trend={{ value: '+18.0%', isPositive: true, label: 'AI Projection' }}
            icon={<CheckCircle className="w-5 h-5" />}
            note="Verified by Model"
          />
        </div>
      </section>

      {/* 6. MODAL DIALOG FLOW */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">6. Modal Dialog Flow</h3>
            <p className="text-xs text-slate-500">
              Accessible overlay with smooth backdrop blur, keyboard ESC dismissal, and primary actions.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Open Agronomist Booking Modal
          </Button>
        </div>

        {modalSuccess && (
          <Alert
            variant="success"
            title="Consultation Request Logged Successfully"
            description="Agronomist Dr. Beatrice Kimani has received your farm plot data and will confirm your on-site inspection time via SMS."
            onDismiss={() => setModalSuccess(false)}
          />
        )}
      </section>

      {/* 7. EMPTY STATES & LOADING SKELETONS */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">7. Empty States & Skeleton Loading</h3>
          <p className="text-xs text-slate-500">
            Resilient zero-broken-layout states when waiting for sensor synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            icon={<Sprout className="w-7 h-7" />}
            title="No Soil Sensors Linked Yet"
            description="Connect your handheld Bluetooth NPK probe or enter your GPS coordinates to activate automated soil moisture and pH tracking."
            actionText="Link Handheld Probe"
            onAction={() => alert('Linking probe...')}
          />

          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Skeleton Loading State
              </span>
              <span className="text-xs text-slate-400 font-mono">Syncing telemetry...</span>
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal Instance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Sub-County Agronomist Farm Visit"
        description="Book a certified field officer to inspect your plot and conduct an on-site soil NPK & leaf pathology diagnostic."
        primaryAction={{
          label: 'Confirm Inspection Booking',
          variant: 'forest',
          onClick: () => {
            setIsModalOpen(false);
            setModalSuccess(true);
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsModalOpen(false),
        }}
      >
        <div className="space-y-4">
          <Select
            label="Select Farm Plot"
            options={[
              { value: 'p1', label: 'Plot A: Central Tea & Maize (8 Acres)' },
              { value: 'p2', label: 'Plot B: Nakuru Dairy Stall (4 Acres)' },
              { value: 'p3', label: 'Plot C: Greenhouse Tomatoes (1.5 Acres)' },
            ]}
          />
          <Input
            label="Preferred Visit Date"
            type="date"
            defaultValue="2026-11-15"
          />
          <Input
            label="Specific Agronomic Concern"
            placeholder="e.g. Yellowing maize leaf margins, suspected nitrogen leaching..."
          />
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs text-emerald-950">
            <span className="font-semibold block mb-0.5">Sub-County Extension Guarantee:</span>
            Inspection fee of KES 500 is payable directly via M-Pesa upon completion. All soil reports are saved permanently to your AgroLink account.
          </div>
        </div>
      </Modal>
    </div>
  );
};
