/**
 * AgroLink Design System — Design Tokens & Brand Specifications
 * 
 * "Technology Meets Agriculture"
 * One Farmer. One Platform. Smarter Agriculture.
 */

export interface ColorToken {
  name: string;
  variable: string;
  hex: string;
  rgb: string;
  hsl: string;
  textContrast: 'white' | 'dark';
  category: 'primary' | 'background' | 'accent' | 'text' | 'semantic';
  description: string;
  usageRule: string;
  wcagAARating: string;
}

export const BRAND_COLORS: ColorToken[] = [
  // Primary Brand Colors
  {
    name: 'Deep Forest Green',
    variable: '--color-agro-forest',
    hex: '#14532D',
    rgb: 'rgb(20, 83, 45)',
    hsl: 'hsl(144, 61%, 20%)',
    textContrast: 'white',
    category: 'primary',
    description: 'The foundation of the AgroLink brand. Symbolizes deep fertile soil, healthy highland crops, and institutional stability.',
    usageRule: 'Use for main brand headers, high-importance titles, primary dark containers, and key navigation accents. Dominant anchor color.',
    wcagAARating: 'AAA (10.9:1 against white)',
  },
  {
    name: 'Primary Green',
    variable: '--color-agro-primary',
    hex: '#16A34A',
    rgb: 'rgb(22, 163, 74)',
    hsl: 'hsl(142, 76%, 36%)',
    textContrast: 'white',
    category: 'primary',
    description: 'The active energy of thriving vegetation, new shoots, and positive progress in farming.',
    usageRule: 'Use for primary buttons, active navigation states, primary interactive toggles, and positive progress indicators.',
    wcagAARating: 'AA (4.6:1 against white for large text, optimal on light backgrounds)',
  },
  {
    name: 'Fresh Green',
    variable: '--color-agro-fresh',
    hex: '#86EFAC',
    rgb: 'rgb(134, 239, 172)',
    hsl: 'hsl(142, 77%, 73%)',
    textContrast: 'dark',
    category: 'primary',
    description: 'Subtle fresh sprouting growth and vital nourishment.',
    usageRule: 'Use as a subtle highlight, background badge tint (with dark green text), or soft ring glow. Never use for raw text on white.',
    wcagAARating: 'Background tint only (9.5:1 with Deep Forest Green text)',
  },

  // Background Colors
  {
    name: 'Warm Cream',
    variable: '--color-agro-cream',
    hex: '#F5F5DC',
    rgb: 'rgb(245, 245, 220)',
    hsl: 'hsl(60, 56%, 91%)',
    textContrast: 'dark',
    category: 'background',
    description: 'The organic warmth of raw harvest grains, organic soils, and East African farmsteads.',
    usageRule: 'Use sparingly as an accent surface or subtle card tone to avoid clinical sterility. Gives warmth without overwhelming the interface.',
    wcagAARating: 'Canvas surface (13.5:1 with Primary Text)',
  },
  {
    name: 'Soft Background',
    variable: '--color-agro-soft',
    hex: '#F8FAFC',
    rgb: 'rgb(248, 250, 252)',
    hsl: 'hsl(210, 40%, 98%)',
    textContrast: 'dark',
    category: 'background',
    description: 'Crisp, ultra-clean modern neutral for spacious daylight outdoor legibility on phones.',
    usageRule: 'The default background for the main dashboard viewports, application canvas, and list containers.',
    wcagAARating: 'Optimal surface background (14.2:1 with Primary Text)',
  },
  {
    name: 'Pure White',
    variable: '--pure-white',
    hex: '#FFFFFF',
    rgb: 'rgb(255, 255, 255)',
    hsl: 'hsl(0, 0%, 100%)',
    textContrast: 'dark',
    category: 'background',
    description: 'Elevated content cards, form inputs, modal dialogs, and active tool surfaces.',
    usageRule: 'Primary surface for cards, dropdown menus, table containers, and text entry fields.',
    wcagAARating: 'Optimal high-contrast card surface',
  },

  // Accent Color
  {
    name: 'Harvest Amber',
    variable: '--color-agro-amber',
    hex: '#F59E0B',
    rgb: 'rgb(245, 158, 11)',
    hsl: 'hsl(38, 92%, 50%)',
    textContrast: 'dark',
    category: 'accent',
    description: 'Golden ripe maize, ripening grain, sunshine, and critical alerts needing attention.',
    usageRule: 'Use for weather warnings, urgent crop advisories, market price spikes, and action badges. High attention budget.',
    wcagAARating: 'AA (Large text/badges with dark text; 3.2:1 against pure white)',
  },

  // Text Colors
  {
    name: 'Primary Text',
    variable: '--color-agro-text-primary',
    hex: '#1E293B',
    rgb: 'rgb(30, 41, 59)',
    hsl: 'hsl(222, 47%, 11%)',
    textContrast: 'white',
    category: 'text',
    description: 'High contrast slate-black designed for harsh sunlight readability on Kenyan fields.',
    usageRule: 'Headings, primary card titles, input text, and core metrics.',
    wcagAARating: 'AAA (12.8:1 against white)',
  },
  {
    name: 'Secondary Text',
    variable: '--color-agro-text-secondary',
    hex: '#64748B',
    rgb: 'rgb(100, 116, 139)',
    hsl: 'hsl(215, 16%, 47%)',
    textContrast: 'white',
    category: 'text',
    description: 'Neutral slate for supporting explanations, descriptions, and timestamps.',
    usageRule: 'Subheadings, card subtitles, descriptions, and field labels.',
    wcagAARating: 'AA (4.8:1 against white, compliant for body text)',
  },
  {
    name: 'Muted Text',
    variable: '--color-agro-text-muted',
    hex: '#94A3B8',
    rgb: 'rgb(148, 163, 184)',
    hsl: 'hsl(214, 20%, 65%)',
    textContrast: 'dark',
    category: 'text',
    description: 'Subdued metadata text, inactive icons, and placeholder strings.',
    usageRule: 'Input placeholders, non-critical timestamps, and secondary metadata separators.',
    wcagAARating: 'Complementary metadata (not for critical reading)',
  },

  // Semantic Colors
  {
    name: 'Semantic Success',
    variable: '--color-agro-success',
    hex: '#16A34A',
    rgb: 'rgb(22, 163, 74)',
    hsl: 'hsl(142, 76%, 36%)',
    textContrast: 'white',
    category: 'semantic',
    description: 'Optimal soil moisture, healthy livestock, verified transactions, timely rainfall.',
    usageRule: 'Success alerts, positive yield comparisons, and verification badges.',
    wcagAARating: 'AA compliant',
  },
  {
    name: 'Semantic Warning',
    variable: '--color-agro-warning',
    hex: '#F59E0B',
    rgb: 'rgb(245, 158, 11)',
    hsl: 'hsl(38, 92%, 50%)',
    textContrast: 'dark',
    category: 'semantic',
    description: 'Frost risk, impending pest migration (e.g. Armyworm), dry spell advisory.',
    usageRule: 'Warning banners, low fertilizer inventory, and pending agronomist reviews.',
    wcagAARating: 'AA compliant with dark text',
  },
  {
    name: 'Semantic Error',
    variable: '--color-agro-error',
    hex: '#DC2626',
    rgb: 'rgb(220, 38, 38)',
    hsl: 'hsl(0, 72%, 51%)',
    textContrast: 'white',
    category: 'semantic',
    description: 'Severe crop blight detected, livestock disease alert, payment failure.',
    usageRule: 'Critical system errors, emergency crop alerts, destructive confirmation actions.',
    wcagAARating: 'AAA compliant (4.6:1 against white)',
  },
  {
    name: 'Semantic Information',
    variable: '--color-agro-info',
    hex: '#2563EB',
    rgb: 'rgb(37, 99, 235)',
    hsl: 'hsl(221, 83%, 53%)',
    textContrast: 'white',
    category: 'semantic',
    description: 'New market price updates, agronomist schedule updates, educational resources.',
    usageRule: 'Informational banners, tip callouts, and market commodity updates.',
    wcagAARating: 'AA compliant (4.5:1 against white)',
  },
];

export const TYPOGRAPHY_SCALE = [
  {
    level: 'Display 1',
    token: 'text-3xl lg:text-4xl font-bold tracking-tight',
    family: 'Plus Jakarta Sans',
    size: '32px / 40px (Desktop)',
    lineHeight: '1.2',
    usage: 'Landing hero headings, platform title, top-level dashboard greeting.',
    sample: 'Kilimo Bora, Mavuno Mengi.',
  },
  {
    level: 'Heading 1',
    token: 'text-2xl lg:text-3xl font-bold',
    family: 'Plus Jakarta Sans',
    size: '24px / 30px',
    lineHeight: '1.25',
    usage: 'Module headers (e.g. Crop Intelligence, Nakuru Dairy Hub).',
    sample: 'Real-Time Soil & Climate Intelligence',
  },
  {
    level: 'Heading 2',
    token: 'text-xl font-semibold',
    family: 'Plus Jakarta Sans',
    size: '20px',
    lineHeight: '1.3',
    usage: 'Card titles, modal headings, section divisions.',
    sample: 'Wakulima Market Maize Prices',
  },
  {
    level: 'Heading 3',
    token: 'text-lg font-semibold',
    family: 'Inter',
    size: '18px',
    lineHeight: '1.4',
    usage: 'Sub-section titles, table column group headers, list headers.',
    sample: 'Recommended Nitrogen Application',
  },
  {
    level: 'Body Large',
    token: 'text-base font-medium',
    family: 'Inter',
    size: '16px',
    lineHeight: '1.5',
    usage: 'Primary interactive button labels, emphasized paragraphs, input text.',
    sample: 'Schedule a visit with your Sub-County Agronomist.',
  },
  {
    level: 'Body Regular',
    token: 'text-sm font-normal',
    family: 'Inter',
    size: '14px',
    lineHeight: '1.5',
    usage: 'Standard reading text, card body descriptions, table cell text.',
    sample: 'Soil moisture is currently at 42% in Plot B (Uasin Gishu Farm). Irrigation is recommended within 48 hours.',
  },
  {
    level: 'Caption / Metadata',
    token: 'text-xs font-medium text-slate-500',
    family: 'Inter',
    size: '12px',
    lineHeight: '1.4',
    usage: 'Timestamps, unit labels, unboxed metadata separators, helper notes.',
    sample: 'Updated 10 mins ago · Eldoret Weather Station · Verified by KALRO',
  },
  {
    level: 'Tabular Metric',
    token: 'text-2xl lg:text-3xl font-bold font-mono tabular-nums tracking-tight',
    family: 'Inter / Mono (Tabular)',
    size: '24px - 32px',
    lineHeight: '1.1',
    usage: 'Yield numbers, KES market prices, soil pH, moisture percentages, livestock milk liters.',
    sample: 'KES 4,850 / 90kg bag',
  },
];

export const SPACING_GRID = [
  { name: 'Micro (4px)', class: 'p-1 / gap-1', px: '4px', usage: 'Icon-to-text spacing, compact indicator padding' },
  { name: 'Tight (8px)', class: 'p-2 / gap-2', px: '8px', usage: 'Chip padding, tight stack items, badge horizontal pad' },
  { name: 'Standard (12px)', class: 'p-3 / gap-3', px: '12px', usage: 'Input interior padding, compact card gap' },
  { name: 'Base (16px)', class: 'p-4 / gap-4', px: '16px', usage: 'Standard mobile screen edge padding, card body' },
  { name: 'Comfort (24px)', class: 'p-6 / gap-6', px: '24px', usage: 'Desktop card internal padding, section vertical stack' },
  { name: 'Spacious (32px)', class: 'p-8 / gap-8', px: '32px', usage: 'Section separations, modal dialog padding' },
  { name: 'Generous (48px)', class: 'p-12 / gap-12', px: '48px', usage: 'Major landing sections, dashboard hero separation' },
];

export const SHADOW_TOKENS = [
  { name: 'Subtle Hairline', class: 'border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', usage: 'Standard dashboard card' },
  { name: 'Interactive Card Hover', class: 'hover:shadow-[0_4px_12px_rgba(20,83,45,0.08)] hover:border-emerald-300 transition-all', usage: 'Clickable modules, farm plots' },
  { name: 'Elevated Surface', class: 'shadow-[0_10px_25px_-5px_rgba(15,23,42,0.1)]', usage: 'Modals, dropdowns, floating bottom mobile bar' },
];

export const BORDER_RADIUS_TOKENS = [
  { name: 'Button / Input Radius', class: 'rounded-xl', px: '12px', math: 'Moderate rounded corners providing friendly modern touch' },
  { name: 'Card Container Radius', class: 'rounded-2xl', px: '16px', math: 'Outer card boundary' },
  { name: 'Child Inner Radius', class: 'rounded-lg', px: '8px', math: 'r_inner = r_outer (16) - padding (8) = 8px' },
  { name: 'Interactive Badge Radius', class: 'rounded-md', px: '6px', math: 'Compact functional pill-free tabs' },
];

export const KENYAN_AGRICULTURAL_DOMAINS = [
  {
    id: 'crops',
    title: 'Crop Intelligence',
    swahili: 'Kilimo cha Mazao',
    icon: 'Sprout',
    description: 'Maize, tea, coffee, horticulture, and potato tracking with AI pest detection and yield optimization.',
    keyMetrics: ['Yield Forecast', 'Growth Stage', 'NDVI Satellite Index', 'Pest Vulnerability'],
  },
  {
    id: 'livestock',
    title: 'Livestock & Dairy',
    swahili: 'Ufugaji Bora',
    icon: 'Beef',
    description: 'Dairy herd lactation cycles, calving alerts, milk quality tracking, and veterinary vaccinations.',
    keyMetrics: ['Daily Milk (L)', 'SCC Cell Count', 'Insemination Due', 'Feed Ratio'],
  },
  {
    id: 'soil_climate',
    title: 'Soil & Climate Hub',
    swahili: 'Hali ya Hewa na Udongo',
    icon: 'CloudRain',
    description: 'Hyper-local weather telemetry, seasonal rain forecasts (Long/Short Rains), soil NPK testing and pH diagnostics.',
    keyMetrics: ['Rainfall Prob %', 'Soil pH (5.8 - 6.5)', 'Moisture %', 'Fertilizer Guide'],
  },
  {
    id: 'market',
    title: 'Agro Markets & Pricing',
    swahili: 'Soko la Mazao',
    icon: 'TrendingUp',
    description: 'Live wholesale commodity prices from Nairobi Wakulima, Mombasa Kongowea, and Eldoret markets with M-Pesa integration.',
    keyMetrics: ['Maize 90kg KES', 'Dry Beans 90kg', 'Grade 1 Tea', 'Buyer Inquiries'],
  },
  {
    id: 'advisory',
    title: 'Agricultural Experts',
    swahili: 'Wataalamu wa Kilimo',
    icon: 'GraduationCap',
    description: 'Verified Kenyan agronomy officers and veterinary doctors available for chat and on-site farm inspections.',
    keyMetrics: ['Available Officers', 'Avg Response: 15m', 'KALRO Guidelines', 'Diagnostic Accuracy'],
  },
];

export interface EcosystemGroup {
  id: string;
  name: string;
  swahiliName: string;
  role: string;
  targetAudience: string;
  valueExchange: string;
  accessModel: 'free' | 'freemium' | 'commission' | 'enterprise';
  icon: string;
  keyFeatures: string[];
}

export const ECOSYSTEM_GROUPS: EcosystemGroup[] = [
  {
    id: 'farmers',
    name: 'Kenyan Farmers',
    swahiliName: 'Wakulima',
    role: 'Primary Producers & Decision Makers',
    targetAudience: 'Smallholders (1–5 acres) and commercial estate managers across Kenya.',
    valueExchange: 'Essential problem-solving tools free forever; pay only for certified value-add professional interventions or guaranteed market sales.',
    accessModel: 'freemium',
    icon: 'Sprout',
    keyFeatures: [
      'Free hyper-local weather & seasonal rain alerts',
      'Free AI crop disease and pest identification',
      'Free access to Nairobi & Eldoret market spot prices',
      'Optional booking for on-site certified agronomists',
      'Direct-to-buyer sales with M-Pesa Escrow guarantee',
    ],
  },
  {
    id: 'professionals',
    name: 'Agricultural Professionals',
    swahiliName: 'Wataalamu wa Kilimo',
    role: 'Specialized Service Providers',
    targetAudience: 'Certified agronomists, veterinary surgeons, soil test labs, and drone spraying operators.',
    valueExchange: 'Direct discovery and booked service requests from farmers; transparent fee structures with automated digital payout.',
    accessModel: 'commission',
    icon: 'GraduationCap',
    keyFeatures: [
      'Verified KALRO / Ministry license badging',
      'Calendar-based farm inspection scheduling',
      'Digital diagnostic reports delivered directly to farmer profiles',
      'Guaranteed M-Pesa client payment upon verified completion',
    ],
  },
  {
    id: 'field_agents',
    name: 'Youth & Field Agents',
    swahiliName: 'Mawakala Vijana',
    role: 'Digital Agriculture Enablers',
    targetAudience: 'Rural Kenyan youth, village aggregation champions, and co-op field coordinators.',
    valueExchange: 'Earn commission per farmer onboarded, per handheld soil test performed, and per ton aggregated at local produce centers.',
    accessModel: 'commission',
    icon: 'Smartphone',
    keyFeatures: [
      'Offline-capable tablet/mobile onboarding mode',
      'Bluetooth handheld soil probe telemetry logging',
      'Produce weighing & digital scale receipt issuance',
      'Real-time commission tracking with instant M-Pesa payout',
    ],
  },
  {
    id: 'agribusinesses',
    name: 'Agribusinesses & Off-Takers',
    swahiliName: 'Mashirika ya Biashara',
    role: 'Commercial Off-takers, Seed & Input Providers',
    targetAudience: 'Food processors (e.g. Unga Group, Brookside Dairy), seed companies, fertilizer firms, and exporters.',
    valueExchange: 'Predictable commodity sourcing, transparent supply chain traceability, and verified farmer clusters.',
    accessModel: 'enterprise',
    icon: 'TrendingUp',
    keyFeatures: [
      'Direct contract farming agreements & crop pledges',
      'Institutional county-level yield and acreage analytics',
      'Escrow-secured forward purchasing for maize, tea, and potatoes',
      'Quality certification verification (GlobalGAP, KEPHIS)',
    ],
  },
];

export const COMMERCIAL_TIERS = [
  {
    id: 'mkulima_free',
    name: 'Mkulima Free (Essential)',
    tagline: 'Always Free. Essential tools every Kenyan farmer deserves.',
    target: 'Smallholder farmers seeking actionable weather, diagnostic advice, and transparent market rates.',
    price: 'KES 0',
    cadence: 'Forever Free',
    isPrimary: false,
    badgeText: 'Free Essential',
    badgeVariant: 'neutral' as const,
    features: [
      'Hyper-local 7-day rainfall & temperature forecasts',
      'Instant AI crop disease photo screening (unlimited)',
      'Wakulima & Kongowea daily wholesale market price board',
      'Emergency pest & climate alert broadcasts (SMS & app)',
      'Basic farm profile & plot inventory logging',
    ],
    ctaText: 'Access Free Tools',
  },
  {
    id: 'mkulima_pro',
    name: 'Mkulima Pro',
    tagline: 'For commercial producers maximizing acreage yields & sales.',
    target: 'Commercial farmers (5+ acres) and specialized dairy units.',
    price: 'KES 750',
    cadence: 'Per Month (Billed Quarterly via M-Pesa)',
    isPrimary: true,
    badgeText: 'Recommended for Commercial Farms',
    badgeVariant: 'forest' as const,
    features: [
      'Everything in Mkulima Free',
      '10-meter satellite NDVI crop health monitoring updated every 5 days',
      'Priority video & chat consultation with vetted agronomists',
      'Direct Buyer Matchmaking with zero commission on first 5 tons',
      'Downloadable farm financial audit reports for bank agricultural loans',
      'Multi-plot soil test trend analysis and customized CAN/DAP guides',
    ],
    ctaText: 'Start 14-Day Free Trial',
  },
  {
    id: 'coop_enterprise',
    name: 'Co-op & Agribusiness',
    tagline: 'Aggregate, trace, and support hundreds of farmers.',
    target: 'Dairy cooperatives, tea/coffee factories, and commercial off-takers.',
    price: 'Custom',
    cadence: 'Per active farmer / season',
    isPrimary: false,
    badgeText: 'Institutional Scale',
    badgeVariant: 'neutral' as const,
    features: [
      'Dedicated field agent management dashboard & route planning',
      'Bulk SMS advisory broadcast in Swahili, Kikuyu, Kalenjin, Luo',
      'Digital produce intake & electronic scale weighing integration',
      'Automated M-Pesa B2C batch payments to farmers upon delivery',
      'Anonymized county yield forecasting & harvest volume pledges',
    ],
    ctaText: 'Contact Enterprise Team',
  },
];

