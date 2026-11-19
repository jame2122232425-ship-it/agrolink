import React, { useState } from 'react';
import {
  Sprout,
  Milk,
  CloudRain,
  TrendingUp,
  GraduationCap,
  Egg,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Droplet,
  Sun,
  MapPin,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge, MetadataRow } from '../../design-system/components/Badge';
import { MetricCard } from '../../design-system/components/MetricCard';

export const FarmerModulesShowcase: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string>('all');

  const domains = [
    { id: 'all', label: 'All Modules' },
    { id: 'crops', label: 'Crops & Highlands' },
    { id: 'livestock', label: 'Dairy & Livestock' },
    { id: 'soil', label: 'Soil & Climate' },
    { id: 'market', label: 'Commodity Markets' },
    { id: 'experts', label: 'Agronomist Network' },
  ];

  return (
    <div className="space-y-10">
      {/* Introduction */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Kenyan Agricultural Modules in Practice
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Preview how the design system unifies Crop farming, Dairy herds, Soil testing,
              Wakulima commodity prices, and Extension services into a cohesive, responsive experience.
            </p>
          </div>
          <Badge variant="forest">6 Agricultural Domains</Badge>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {domains.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDomain(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeDomain === d.id
                  ? 'bg-[#14532D] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Real Farmer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Crop Farming (Highland Tea & Maize) */}
        {(activeDomain === 'all' || activeDomain === 'crops') && (
          <Card padding="none" className="overflow-hidden border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
              <img
                src="/src/assets/images/kenya_tea_maize_field_1794433589920.jpg"
                alt="Kenyan highland terraced tea and maize farms"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 text-[#14532D] backdrop-blur-xs shadow-xs">
                  Crop Intelligence
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-700 text-white shadow-xs">
                  Plot 1A: Tea & Maize
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Central Highlands Tea & Maize Plot
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kirinyaga County · 14.5 Acres · Volcanic Soil
                  </p>
                </div>
                <Badge variant="success" hasDot>
                  Vigor: 94%
                </Badge>
              </div>

              {/* Data Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Growth Stage
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">Tasseling</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Satellite NDVI
                  </span>
                  <span className="text-sm font-bold text-[#16A34A] font-mono tabular-nums">0.78</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Harvest Window
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono">22 Days</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Vegetation canopy index shows strong nitrogen uptake following top-dressing. No
                armyworm egg clusters detected in satellite or visual scouting reports.
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <MetadataRow items={['Scouted Yesterday', 'Sensor #KG-412']} />
                <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                  Plot Diagnostics
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Module 2: Livestock & Dairy Farming */}
        {(activeDomain === 'all' || activeDomain === 'livestock') && (
          <Card padding="none" className="overflow-hidden border-slate-200 shadow-xs hover:shadow-md transition-all">
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
              <img
                src="/src/assets/images/kenya_dairy_livestock_1794433591521.jpg"
                alt="Modern Nakuru dairy farm with healthy cattle"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 text-[#14532D] backdrop-blur-xs shadow-xs">
                  Livestock & Dairy
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-700 text-white shadow-xs">
                  Herd: 32 Cattle
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Nakuru Valley Dairy Unit
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rift Valley · Holstein-Friesian & Jersey Herd
                  </p>
                </div>
                <Badge variant="success" hasDot>
                  Milk Quality: Grade A
                </Badge>
              </div>

              {/* Data Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Morning Yield
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">412 Liters</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Co-op Payout
                  </span>
                  <span className="text-sm font-bold text-[#16A34A] font-mono tabular-nums">KES 52 / L</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                    Vaccine Due
                  </span>
                  <span className="text-sm font-bold text-amber-700 font-mono">3 Cows</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Feed ratio adjusted to 60% silage + 40% dairy meal with mineral lick. Somatic cell count
                is optimal across all 18 lactating cows.
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <MetadataRow items={['Co-op: Nakuru Dairy', 'Daily Sync: 07:30']} />
                <Button variant="forest" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                  Log Evening Milk
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Module 3: Soil Intelligence & Climate Hub */}
        {(activeDomain === 'all' || activeDomain === 'soil') && (
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CloudRain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Eldoret Climate & Soil Probe Hub
                    </h3>
                    <p className="text-xs text-slate-500">
                      Uasin Gishu Station · Long Rains Telemetry
                    </p>
                  </div>
                </div>
                <Badge variant="harvest" hasDot>
                  Rain in 4h
                </Badge>
              </div>

              {/* Live Metric Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Soil pH
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 tabular-nums">6.2</span>
                  <span className="text-[10px] text-emerald-700 font-medium block">Optimal</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Moisture
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 tabular-nums">48%</span>
                  <span className="text-[10px] text-emerald-700 font-medium block">Good</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Nitrogen (N)
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 tabular-nums">28 ppm</span>
                  <span className="text-[10px] text-emerald-700 font-medium block">Balanced</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    24h Rain
                  </span>
                  <span className="text-base font-bold font-mono text-blue-700 tabular-nums">34 mm</span>
                  <span className="text-[10px] text-blue-600 font-medium block">80% Prob</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-950 mb-3">
                <span className="font-semibold block mb-0.5">Fertilizer Recommendation:</span>
                Moisture is primed for Calcium Ammonium Nitrate (CAN) top dressing. Apply before 2:00 PM rains.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <MetadataRow items={['Calibrated Oct 2026', 'Sensor S-204']} />
              <Button variant="outline" size="sm">
                Full Soil Chemistry
              </Button>
            </div>
          </Card>
        )}

        {/* Module 4: Agricultural Commodity Markets (Wakulima Market Nairobi) */}
        {(activeDomain === 'all' || activeDomain === 'market') && (
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Wakulima & Kongowea Wholesale Index
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live Kenyan Commodity Rates · M-Pesa Direct Settlement
                    </p>
                  </div>
                </div>
                <Badge variant="harvest">Live Bids</Badge>
              </div>

              {/* Table of Kenyan Commodities */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Commodity</th>
                      <th className="py-2.5 px-3">Wholesale Market</th>
                      <th className="py-2.5 px-3 text-right">Price (KES)</th>
                      <th className="py-2.5 px-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold">Dry Maize (90kg)</td>
                      <td className="py-2.5 px-3 text-slate-500">Nairobi Wakulima</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums">4,850</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">+12%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold">Irish Potatoes (50kg)</td>
                      <td className="py-2.5 px-3 text-slate-500">Mombasa Kongowea</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums">3,200</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">+8.5%</td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold">Rosecoco Beans (90kg)</td>
                      <td className="py-2.5 px-3 text-slate-500">Eldoret Wholesale</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums">11,400</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-500">0.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">8 Verified Aggregators Ready</span>
              <Button variant="forest" size="sm">
                Sell Produce to Buyers
              </Button>
            </div>
          </Card>
        )}

        {/* Module 5: Agronomist & Extension Officer Network */}
        {(activeDomain === 'all' || activeDomain === 'experts') && (
          <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all lg:col-span-2">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                <img
                  src="/src/assets/images/kenya_agronomist_portrait_1794433591071.jpg"
                  alt="Dr. Beatrice Kimani, Senior Agronomist"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Dr. Beatrice Kimani, Lead Agronomist
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nakuru & Baringo Sub-County Agricultural Officer · KALRO Senior Fellow
                    </p>
                  </div>
                  <Badge variant="forest">Online for Consultations</Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Specialist in highland soil acid remediation, maize ear rot control, and high-yield
                  fodder silaging. Available for video call triage or dispatching field inspection
                  agents within 24 hours.
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    Verified Ministry License #AG-8821
                  </span>
                  <span>·</span>
                  <span>1,420 Farm Audits Completed</span>
                  <span>·</span>
                  <span className="font-semibold text-emerald-700">4.9 / 5.0 Rating</span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto">
                <Button variant="primary" size="md">
                  Request Instant Advice
                </Button>
                <Button variant="secondary" size="md">
                  Book On-Farm Visit
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
