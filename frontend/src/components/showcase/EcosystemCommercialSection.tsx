import React, { useState } from 'react';
import {
  Sprout,
  GraduationCap,
  Smartphone,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Coins,
  FileText,
  Users,
  Award,
  ChevronRight,
  ExternalLink,
  Info,
  Calendar,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge, MetadataRow } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { ECOSYSTEM_GROUPS, COMMERCIAL_TIERS } from '../../design-system/tokens';

export const EcosystemCommercialSection: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [activeDemo, setActiveDemo] = useState<'services' | 'marketplace' | 'agents' | 'pricing' | 'institutional'>('services');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  return (
    <div className="space-y-12">
      {/* 1. Ecosystem Overview Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14532D] text-white p-6 sm:p-10 shadow-xl">
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-4">
            <Coins className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Section 11: Business Model & Economic Ecosystem</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
            A Dignified, Problem-First Agricultural Economy
          </h2>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed mb-6">
            AgroLink connects <strong>Farmers</strong>, <strong>Agricultural Professionals</strong>,{' '}
            <strong>Youth Field Agents</strong>, and <strong>Commercial Agribusinesses</strong>.
            Crucially, we maintain a strict boundary: the farmer interface is never turned into an
            aggressive commercial sales engine. Farmers first experience AgroLink as an essential,
            trustworthy problem-solver.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-emerald-700/60 text-xs">
            <div>
              <span className="text-[#86EFAC] font-bold block text-sm">1. Farmers</span>
              <span className="text-emerald-200/80">Problem-solving free</span>
            </div>
            <div>
              <span className="text-[#86EFAC] font-bold block text-sm">2. Experts</span>
              <span className="text-emerald-200/80">KALRO verified services</span>
            </div>
            <div>
              <span className="text-[#86EFAC] font-bold block text-sm">3. Youth Agents</span>
              <span className="text-emerald-200/80">Village digital adoption</span>
            </div>
            <div>
              <span className="text-[#86EFAC] font-bold block text-sm">4. Agribusiness</span>
              <span className="text-emerald-200/80">Fair contracts & escrow</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Free vs Paid Essential Architectural Boundary */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">
            The Free vs. Paid Architectural Boundary
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            How we protect farmer trust while sustaining commercial operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Always Free Essential Tools */}
          <Card padding="md" className="border-emerald-200/80 bg-emerald-50/20 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#14532D] text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#86EFAC]" />
                Always Free Forever (No Paywalls)
              </span>
              <span className="text-[11px] font-mono text-emerald-800 font-semibold">100% Free</span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Foundational agricultural intelligence required for food security is accessible to every
              Kenyan smallholder without commercial pressure.
            </p>
            <ul className="text-xs text-slate-700 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <span><strong>Hyper-local Weather & Rainfall Alerts:</strong> 7-day county radar telemetry.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <span><strong>AI Crop Disease Diagnosis:</strong> Instant camera leaf scan for blight and rust.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <span><strong>Public Market Spot Prices:</strong> Daily Wakulima & Kongowea commodity prices.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <span><strong>Emergency Pest Warnings:</strong> Ministry & KALRO armyworm alerts via SMS.</span>
              </li>
            </ul>
          </Card>

          {/* Value-Add Paid Commercial Interventions */}
          <Card padding="md" className="border-amber-200/80 bg-amber-50/20 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F59E0B] text-slate-950">
                <Coins className="w-3.5 h-3.5" />
                Value-Add Commercial Services
              </span>
              <span className="text-[11px] font-mono text-amber-900 font-semibold">Transparent Pricing</span>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Clearly marked commercial features that require specialized labor, laboratory testing,
              or contractual financial commitments.
            </p>
            <ul className="text-xs text-slate-700 space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span><strong>Certified Laboratory Soil Chemistry:</strong> Official NPK core report (KES 1,800).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span><strong>On-Farm Agronomist Inspection:</strong> In-person plot audit and diagnosis (KES 500).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span><strong>Off-Taker Produce Escrow:</strong> Guaranteed forward sales with M-Pesa lock (1.5% fee).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <span><strong>Commercial Pro Subscription:</strong> 10m satellite NDVI parcel monitoring (KES 750/mo).</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* 3. The 4 Major Ecosystem Groups */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              The 4 Connected Ecosystem Groups
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Filter to examine roles, value exchange, and monetization mechanics.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {['all', 'farmers', 'professionals', 'field_agents', 'agribusinesses'].map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  activeGroup === g
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {g.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ECOSYSTEM_GROUPS.filter(
            (item) => activeGroup === 'all' || activeGroup === item.id
          ).map((group) => (
            <Card
              key={group.id}
              padding="md"
              className="border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wider block">
                      {group.swahiliName}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">{group.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{group.role}</span>
                  </div>
                  <Badge variant={group.accessModel === 'free' ? 'forest' : group.accessModel === 'commission' ? 'harvest' : 'neutral'}>
                    {group.accessModel}
                  </Badge>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mb-4 space-y-1">
                  <div><strong className="text-slate-800">Target:</strong> {group.targetAudience}</div>
                  <div><strong className="text-slate-800">Value Model:</strong> {group.valueExchange}</div>
                </div>

                <div className="space-y-2 mb-4">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                    Core Platform Capabilities:
                  </span>
                  {group.keyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">AgroLink Verified Framework</span>
                <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                  Integrated Flow <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 4. Interactive Commercial Interfaces Showcase */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">
              Interactive Commercial Interface Patterns
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Explore the 5 production-grade UI templates designed for future economic workflows.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveDemo('services')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeDemo === 'services' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Expert Booking
            </button>
            <button
              onClick={() => setActiveDemo('marketplace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeDemo === 'marketplace' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Produce Market & Escrow
            </button>
            <button
              onClick={() => setActiveDemo('agents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeDemo === 'agents' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Youth Field Agent Hub
            </button>
            <button
              onClick={() => setActiveDemo('pricing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeDemo === 'pricing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4. Subscription Tiers
            </button>
            <button
              onClick={() => setActiveDemo('institutional')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeDemo === 'institutional' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5. Institutional Analytics
            </button>
          </div>
        </div>

        {/* Demo 1: Professional Service Discovery & Booking */}
        {activeDemo === 'services' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Design Rule:</strong> All professional service fees must be clearly stated before booking. No unexpected hidden charges.
                </span>
              </span>
              <Badge variant="info">Transparent Pricing</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Service 1: Laboratory Soil Chemical Test */}
              <Card padding="md" className="border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wide">
                      Soil Testing
                    </span>
                    <Badge variant="forest">KALRO Accredited</Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    Complete Laboratory NPK & pH Diagnostic
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Chemical analysis of 5 core soil samples with certified lime and fertilizer prescription.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Standard Fee
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      KES 1,800 <span className="text-xs font-normal text-slate-500">/ plot sample</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                      Turnaround: 3 Working Days
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => setIsBookingOpen(true)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Book Soil Sample Pickup
                </Button>
              </Card>

              {/* Service 2: Veterinary Ultrasound & AI Diagnosis */}
              <Card padding="md" className="border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wide">
                      Livestock Health
                    </span>
                    <Badge variant="forest">Licensed Vet Surgeon</Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    Dairy Herd Reproductive & Pregnancy Scan
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    On-farm portable ultrasound scan for conception confirmation and uterine health.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Standard Fee
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      KES 650 <span className="text-xs font-normal text-slate-500">/ animal</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                      Available: Nakuru & Nyandarua
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setIsBookingOpen(true)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Schedule Vet Visit
                </Button>
              </Card>

              {/* Service 3: Drone Precision Crop Spraying */}
              <Card padding="md" className="border-slate-200 bg-white flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wide">
                      AgTech Services
                    </span>
                    <Badge variant="neutral">KCAA Licensed Drone</Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    Autonomous Drone Foliar & Fungicide Spray
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Precision micro-droplet application saving 30% chemical costs on large maize or tea acreage.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Standard Fee
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      KES 850 <span className="text-xs font-normal text-slate-500">/ acre</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
                      Minimum 5 Acres per cluster
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setIsBookingOpen(true)}
                  leftIcon={<Calendar className="w-4 h-4" />}
                >
                  Book Drone Cluster
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* Demo 2: Produce Marketplace & Escrow Protected Off-taker */}
        {activeDemo === 'marketplace' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>
                  <strong>M-Pesa Escrow Protection:</strong> Buyer funds are locked before collection;
                  funds release automatically to farmer once weight & moisture are verified.
                </span>
              </span>
              <Badge variant="forest">Zero Broker Exploitation</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Marketplace Listing 1: Dry White Maize */}
              <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wide">
                      Bulk Grain Listing
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">
                      150 Bags Dry White Maize (Grade 1)
                    </h4>
                    <p className="text-xs text-slate-500">Uasin Gishu Grain Hub · Harvested Nov 2026</p>
                  </div>
                  <Badge variant="harvest" hasDot>
                    Verified Lot
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Moisture</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">13.2%</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Asking Price</span>
                    <span className="text-sm font-bold text-[#16A34A] font-mono tabular-nums">KES 4,800</span>
                    <span className="text-[10px] text-slate-500 block">/ 90kg bag</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Lot Value</span>
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">720,000 KES</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-slate-700 mb-4">
                  <div className="flex items-center gap-1.5 font-semibold text-[#14532D] mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    <span>Active Buyer Offer: Unga Millers Ltd</span>
                  </div>
                  <span className="text-slate-600 block">
                    Offer: KES 4,750 / bag farmgate pickup. M-Pesa escrow ready for release upon digital scale confirmation.
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <MetadataRow items={['Plot #E-89', 'Seller: Keringet Farm']} />
                  <Button
                    variant="forest"
                    size="sm"
                    onClick={() => {
                      setIsOfferOpen(true);
                    }}
                  >
                    Review Buyer Agreement
                  </Button>
                </div>
              </Card>

              {/* Marketplace Listing 2: Irish Potatoes Nyandarua */}
              <Card padding="md" className="border-slate-200 bg-white shadow-xs hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wide">
                      Horticulture Listing
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">
                      4 Tons Shangi Irish Potatoes (Size 1)
                    </h4>
                    <p className="text-xs text-slate-500">Ol Kalou, Nyandarua County · Red Soil</p>
                  </div>
                  <Badge variant="success" hasDot>
                    Fresh Harvest
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Variety</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">Shangi</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Unit Price</span>
                    <span className="text-sm font-bold text-[#16A34A] font-mono tabular-nums">KES 64</span>
                    <span className="text-[10px] text-slate-500 block">/ kg net</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Lot Value</span>
                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">256,000 KES</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 mb-4">
                  <div className="flex items-center gap-1.5 font-semibold text-[#B45309] mb-0.5">
                    <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                    <span>Nairobi Supermarket Chain Inquiry</span>
                  </div>
                  <span className="text-slate-600 block">
                    Requires washed & sorted crates. Offers KES 70/kg delivered to Nairobi distribution center.
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <MetadataRow items={['Nyandarua Co-op Member', 'Certified Soil']} />
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => {
                      setIsOfferOpen(true);
                    }}
                  >
                    Accept Supermarket Contract
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Demo 3: Youth Field Agent Activity Hub */}
        {activeDemo === 'agents' && (
          <div className="space-y-6">
            <Card padding="none" className="overflow-hidden border-slate-200 bg-white shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-slate-100 min-h-[300px]">
                  <img
                    src="/src/assets/images/kenya_youth_field_agent_1794434312072.jpg"
                    alt="Youth field agent assisting smallholder farmer with digital scale at collection center"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 text-[#14532D] backdrop-blur-xs shadow-xs">
                      Village Digitization Agent
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#14532D] uppercase tracking-wider">
                        Agent Profile: Brian Cheruiyot
                      </span>
                      <Badge variant="forest">Accredited Agent #FA-401</Badge>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">
                      Empowering Rural Youth Through Digital Agriculture
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Youth agents bridge the smartphone gap for smallholders and elderly farmers.
                      Equipped with an offline-first AgroLink tablet and Bluetooth soil probe, they
                      onboard farmers, record digital scale harvests, and earn fair commissions.
                    </p>

                    {/* Agent Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Farmers Onboarded
                        </span>
                        <span className="text-base font-bold text-slate-900 font-mono tabular-nums">48</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Soil Tests Run
                        </span>
                        <span className="text-base font-bold text-slate-900 font-mono tabular-nums">22</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Commission (KES)
                        </span>
                        <span className="text-base font-bold text-[#16A34A] font-mono tabular-nums">16,400</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div>• Station: Marigat Produce Collection Center (Baringo County)</div>
                      <div>• Next Scheduled Ward Sweep: Ilchamus Location (Tomorrow 08:00 AM)</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">M-Pesa Auto-Settled</span>
                    <Button variant="forest" size="sm">
                      Sync Field Telemetry
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Demo 4: Subscription Tiers & Commercial Pricing Architecture */}
        {activeDemo === 'pricing' && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto mb-6">
              <h4 className="text-lg font-bold text-slate-900">
                Transparent Subscription Architecture
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Zero deceptive billing. Essential tools are free forever; paid tiers are designed
                strictly for commercial operations and cooperatives.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COMMERCIAL_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                    tier.isPrimary
                      ? 'bg-white border-2 border-[#16A34A] shadow-xl relative'
                      : 'bg-white border border-slate-200/90 shadow-xs'
                  }`}
                >
                  {tier.isPrimary && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold tracking-wide uppercase shadow-sm">
                      Commercial Recommendation
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-base font-bold text-slate-900">{tier.name}</h4>
                      <Badge variant={tier.badgeVariant} size="sm">
                        {tier.badgeText}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">{tier.tagline}</p>

                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                          {tier.price}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {tier.cadence}
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-6 text-xs text-slate-700">
                      <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide block">
                        Included Features:
                      </span>
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant={tier.isPrimary ? 'primary' : 'secondary'}
                    size="md"
                    fullWidth
                    onClick={() => alert(`Selected tier: ${tier.name}`)}
                  >
                    {tier.ctaText}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo 5: Institutional Analytics for Agribusinesses & Ministry */}
        {activeDemo === 'institutional' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>Farmer Privacy Guarantee:</strong> Data displayed to agribusinesses and
                  ministries is anonymized and aggregated at sub-county level. Individual farmer
                  landholdings are never exposed without consent.
                </span>
              </span>
              <Badge variant="neutral">GDPR & Kenya Data Protection Act Aligned</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card padding="md" className="border-slate-200 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Uasin Gishu County
                </span>
                <h4 className="text-base font-bold text-slate-900 mb-2">
                  Maize Harvest Volume Projection
                </h4>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums mb-1">
                  4,820,000 <span className="text-xs font-normal text-slate-500">Bags (90kg)</span>
                </div>
                <div className="text-xs text-emerald-700 font-semibold mb-3">
                  +8.4% above 5-year average
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aggregated from 12,400 active farmer plots. Long Rains moisture distribution was
                  optimal during silking.
                </p>
              </Card>

              <Card padding="md" className="border-slate-200 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Rift Valley Dairy Belt
                </span>
                <h4 className="text-base font-bold text-slate-900 mb-2">
                  Daily Chilled Milk Aggregation
                </h4>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums mb-1">
                  184,500 <span className="text-xs font-normal text-slate-500">Liters / day</span>
                </div>
                <div className="text-xs text-blue-700 font-semibold mb-3">
                  98.2% Grade A Quality Standard
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Direct telemetry from 24 co-op cooling centers across Nakuru, Bomet, and Kericho.
                </p>
              </Card>

              <Card padding="md" className="border-slate-200 bg-white">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Input Supply Logistics
                </span>
                <h4 className="text-base font-bold text-slate-900 mb-2">
                  Forecasted CAN Fertilizer Demand
                </h4>
                <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums mb-1">
                  14,200 <span className="text-xs font-normal text-slate-500">Metric Tons</span>
                </div>
                <div className="text-xs text-amber-700 font-semibold mb-3">
                  Early top-dressing rush expected in 18 days
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enables input distributors to preposition stock in Eldoret and Kitale depots to
                  prevent localized price gouging.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal Flow */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        title="Book Professional Agricultural Service"
        description="Select your farm plot and preferred date. Inspection and testing fees are transparent and paid directly via M-Pesa."
        primaryAction={{
          label: 'Confirm & Authorize via M-Pesa',
          variant: 'forest',
          onClick: () => {
            setIsBookingOpen(false);
            setBookingSuccess(true);
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsBookingOpen(false),
        }}
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Service Selection"
            options={[
              { value: 'soil_lab', label: 'Complete Laboratory NPK Test (KES 1,800)' },
              { value: 'vet_scan', label: 'Dairy Herd Pregnancy Ultrasound (KES 650/cow)' },
              { value: 'drone_spray', label: 'Precision Drone Crop Spray (KES 850/acre)' },
            ]}
          />
          <Input
            label="M-Pesa Mobile Number"
            prefixText="+254"
            defaultValue="712 345 678"
            helperText="Prompt will be dispatched upon verified service delivery"
          />
          <Input
            label="Preferred Service Date"
            type="date"
            defaultValue="2026-11-20"
          />
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
            <strong>AgroLink Guarantee:</strong> Funds remain securely in escrow until you approve the
            uploaded diagnostic report or service delivery ticket.
          </div>
        </div>
      </Modal>

      {/* Produce Agreement Modal Flow */}
      <Modal
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        title="Forward Purchase Agreement: M-Pesa Escrow"
        description="Connect directly with verified off-takers without predatory middle-men."
        primaryAction={{
          label: 'Sign Digital Sale Contract',
          variant: 'primary',
          onClick: () => {
            setIsOfferOpen(false);
            setOfferSuccess(true);
          },
        }}
        secondaryAction={{
          label: 'Decline Offer',
          onClick: () => setIsOfferOpen(false),
        }}
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-900 text-sm mb-1">Contract Summary:</div>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div><strong>Buyer:</strong> Unga Millers Ltd</div>
              <div><strong>Commodity:</strong> Grade 1 White Maize</div>
              <div><strong>Agreed Price:</strong> KES 4,750 / bag</div>
              <div><strong>Quantity:</strong> 150 Bags (13,500 kg)</div>
              <div><strong>Total Payout:</strong> KES 712,500</div>
              <div><strong>Escrow Status:</strong> Funds Pre-Loaded</div>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
            Delivery pickup scheduled at farm gate. Driver weighs bags using calibrated Bluetooth scale.
            Payment lands instantly in your M-Pesa account on bag signoff.
          </div>
        </div>
      </Modal>

      {/* Confirmation Alerts */}
      {bookingSuccess && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Service booking confirmed. The certified provider has scheduled your farm plot inspection.</span>
          </span>
          <button
            onClick={() => setBookingSuccess(false)}
            className="text-xs text-emerald-800 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {offerSuccess && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Digital purchase agreement signed. Escrow code dispatched to your M-Pesa phone.</span>
          </span>
          <button
            onClick={() => setOfferSuccess(false)}
            className="text-xs text-emerald-800 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
