import React from 'react';
import { Sprout, ShieldCheck, Cpu, Smartphone, Award, Compass, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../design-system/components/Card';
import { Badge, MetadataRow } from '../../design-system/components/Badge';

export const BrandIdentitySection: React.FC = () => {
  return (
    <div className="space-y-12">
      {/* Brand Hero Introduction */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14532D] text-white p-6 sm:p-10 lg:p-12 shadow-xl">
        {/* Subtle decorative background organic rings */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full border border-emerald-700/40 pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full border border-emerald-600/30 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-4">
            <Sprout className="w-3.5 h-3.5 text-[#86EFAC]" />
            <span>Official Brand Identity & UI Design System</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 text-balance">
            Agro<span className="text-[#86EFAC]">Link</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-emerald-100/90 mb-4 tracking-tight">
            One Farmer. One Platform. Smarter Agriculture.
          </p>

          <p className="text-sm sm:text-base text-emerald-200/80 leading-relaxed max-w-2xl">
            AgroLink is an integrated agricultural intelligence platform that connects crop farming,
            livestock management, agricultural experts, climate information, soil intelligence and
            agricultural commodity markets. Designed for Kenyan farmers with a scalable vision
            across Africa.
          </p>

          <div className="mt-6 pt-6 border-t border-emerald-700/60 flex flex-wrap items-center gap-4 sm:gap-8 text-xs text-emerald-200 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#86EFAC]" />
              <span>Technology Meets Agriculture</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span>Kenyan Field Tested</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>Mobile-First & Offline Resilient</span>
            </div>
          </div>
        </div>
      </div>

      {/* Design Personality Pillars */}
      <div>
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Design Personality: Technology Meets Agriculture
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            We marry the precision and sophistication of a modern technology startup with the natural
            warmth, trust, and physical reality of East African farming.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Innovative & Intelligent
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI crop diagnosis, predictive rainfall cycles, and automated soil NPK interpretation
              delivered through clear, human prose.
            </p>
          </Card>

          <Card padding="md" className="border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#14532D] flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Professional & Trustworthy
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              High-contrast tabular figures, verified KALRO agronomists, and transparent market
              prices from Nairobi Wakulima and Eldoret.
            </p>
          </Card>

          <Card padding="md" className="border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Natural & Welcoming
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gentle Warm Cream accents, Deep Forest Green anchors, and organic visual breathing room.
              Never cold or sterile.
            </p>
          </Card>

          <Card padding="md" className="border-slate-200 hover:border-emerald-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Accessible & Field-Ready
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ergonomic 44px+ touch hitboxes, outdoor sunlight contrast (10.9:1), M-Pesa integration,
              and low-bandwidth optimization.
            </p>
          </Card>
        </div>
      </div>

      {/* Visual Identity & Authentic Kenyan Photography Showcase */}
      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Authentic African Agricultural Visual Language
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Real imagery reflecting the diversity of Kenyan crop farming, dairy herds, and field agronomists.
            </p>
          </div>
          <Badge variant="forest">Production Assets Verified</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Visual 1: Crop Highlands */}
          <div className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="/src/assets/images/kenya_tea_maize_field_1794433589920.jpg"
                alt="Kenyan highland terraced tea and maize farms under Mt. Kenya"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/90 text-[#14532D] backdrop-blur-xs shadow-xs">
                  Crops & Agroforestry
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Central Highlands Crop Systems
              </h4>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Rich volcanic red soil terraced with tea, maize, and beans under morning highland light.
              </p>
              <MetadataRow
                items={['Kirinyaga & Nyeri Counties', 'Tea / Maize / Coffee', 'Satellite NDVI Tracked']}
              />
            </div>
          </div>

          {/* Visual 2: Dairy & Livestock */}
          <div className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="/src/assets/images/kenya_dairy_livestock_1794433591521.jpg"
                alt="Modern Nakuru dairy farm with Holstein-Friesian cattle in open-air shaded stall"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/90 text-[#14532D] backdrop-blur-xs shadow-xs">
                  Livestock & Dairy
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Rift Valley Dairy Paddock
              </h4>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Ventilated, hygienic dairy sheds tracking milk volume, somatic cell counts, and nutrition.
              </p>
              <MetadataRow
                items={['Nakuru & Uasin Gishu', 'Holstein-Friesian', '24.5 L / Cow Average']}
              />
            </div>
          </div>

          {/* Visual 3: Extension Officer & Farmer */}
          <div className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="/src/assets/images/kenya_agronomist_portrait_1794433591071.jpg"
                alt="Kenyan agricultural officer and farmer holding soil testing kit"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/90 text-[#14532D] backdrop-blur-xs shadow-xs">
                  Extension & Advisory
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Sub-County Agronomy Network
              </h4>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Certified field officers with digital soil sensors and localized Swahili/English counsel.
              </p>
              <MetadataRow
                items={['Vetted by KALRO', 'On-Farm Diagnostics', 'Avg 15m Response']}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
