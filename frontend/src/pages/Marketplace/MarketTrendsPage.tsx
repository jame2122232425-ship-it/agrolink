import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Info, MapPin, Search, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';

const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera', 'Marsabit',
  'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga',
  "Murang'a", 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo-Marakwet',
  'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga',
  'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi',
];

const ESTIMATED_PRICES = [
  { commodity: 'Dry maize (90kg bag)', price: 4825, kind: 'crop' as const, category: 'Grains' },
  { commodity: 'Wheat (90kg bag)', price: 6200, kind: 'crop' as const, category: 'Grains' },
  { commodity: 'Rice (kg)', price: 190, kind: 'crop' as const, category: 'Grains' },
  { commodity: 'Rosecoco beans (90kg bag)', price: 12400, kind: 'crop' as const, category: 'Pulses' },
  { commodity: 'Green grams (kg)', price: 170, kind: 'crop' as const, category: 'Pulses' },
  { commodity: 'Cowpeas (kg)', price: 140, kind: 'crop' as const, category: 'Pulses' },
  { commodity: 'Groundnuts (kg)', price: 260, kind: 'crop' as const, category: 'Pulses' },
  { commodity: 'Tomatoes (crate)', price: 3600, kind: 'crop' as const, category: 'Vegetables' },
  { commodity: 'Sukuma wiki (bunch)', price: 38, kind: 'crop' as const, category: 'Vegetables' },
  { commodity: 'Onions (kg)', price: 140, kind: 'crop' as const, category: 'Vegetables' },
  { commodity: 'Irish potatoes (kg)', price: 95, kind: 'crop' as const, category: 'Vegetables' },
  { commodity: 'Cabbage (head)', price: 70, kind: 'crop' as const, category: 'Vegetables' },
  { commodity: 'Avocado (fruit)', price: 20, kind: 'crop' as const, category: 'Fruits' },
  { commodity: 'Bananas (kg)', price: 35, kind: 'crop' as const, category: 'Fruits' },
  { commodity: 'Cow milk (litre)', price: 54, kind: 'livestock' as const, category: 'Dairy' },
  { commodity: 'Goat milk (litre)', price: 95, kind: 'livestock' as const, category: 'Dairy' },
  { commodity: 'Chicken eggs (each)', price: 20, kind: 'livestock' as const, category: 'Poultry' },
  { commodity: 'Indigenous chicken (bird)', price: 1100, kind: 'livestock' as const, category: 'Poultry' },
  { commodity: 'Broiler chicken (bird)', price: 700, kind: 'livestock' as const, category: 'Poultry' },
  { commodity: 'Goat (head)', price: 10000, kind: 'livestock' as const, category: 'Livestock' },
  { commodity: 'Sheep (head)', price: 9500, kind: 'livestock' as const, category: 'Livestock' },
  { commodity: 'Pig (kg liveweight)', price: 350, kind: 'livestock' as const, category: 'Livestock' },
  { commodity: 'Beef cattle (kg liveweight)', price: 240, kind: 'livestock' as const, category: 'Livestock' },
  { commodity: 'Honey (kg)', price: 750, kind: 'livestock' as const, category: 'Other' },
];

type PriceRow = { county: string; commodity: string; average: number; date: string; estimated: boolean; kind: 'crop' | 'livestock' };

export const MarketTrendsPage: React.FC = () => {
  const [priceRefresh, setPriceRefresh] = useState(0);
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedKind, setSelectedKind] = useState<'all' | 'crop' | 'livestock'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const interval = window.setInterval(() => setPriceRefresh((refresh) => refresh + 1), 10_000);
    return () => window.clearInterval(interval);
  }, []);

  const rows = useMemo<PriceRow[]>(() => {
    const counties = selectedCounty === 'all' ? KENYA_COUNTIES : [selectedCounty];
    const estimates: PriceRow[] = counties.flatMap((county) => ESTIMATED_PRICES
      .filter((item) => selectedKind === 'all' || item.kind === selectedKind)
      .filter((item) => selectedCategory === 'all' || item.category === selectedCategory)
      .map((item, index) => {
        const countyIndex = KENYA_COUNTIES.indexOf(county);
        const stableVariation = (((countyIndex * 17 + index * 11) % 19) - 9) / 100;
        const refreshVariation = (((priceRefresh * 7 + countyIndex * 3 + index * 5) % 5) - 2) / 100;
        const variation = stableVariation + refreshVariation;
        return { county, commodity: item.commodity, kind: item.kind, average: Math.round(item.price * (1 + variation) * 100) / 100, date: 'Estimate', estimated: true };
      }));
    return estimates
      .filter((row) => selectedCounty === 'all' || row.county === selectedCounty)
      .filter((row) => row.commodity.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      .sort((a, b) => a.commodity.localeCompare(b.commodity) || a.county.localeCompare(b.county));
  }, [selectedCounty, selectedKind, selectedCategory, search, priceRefresh]);

  const categories = useMemo(() => [...new Set(ESTIMATED_PRICES
    .filter((item) => selectedKind === 'all' || item.kind === selectedKind)
    .map((item) => item.category))], [selectedKind]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) setSelectedCategory('all');
  }, [categories, selectedCategory]);

  const selectClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15';
  const formatter = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <PageHeader
        eyebrow="Agricultural Commerce · Kenya"
        title="Market Prices & Trends"
        description="Explore indicative crop and livestock prices and compare counties."
        icon={<TrendingUp />}
        meta={<Badge variant="forest" size="sm">Demonstration estimates</Badge>}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p><strong>Indicative sample prices:</strong> County price differences are simulated for demonstration and are not live market quotes. Published observations are identified separately.</p>
      </div>

      <Card padding="sm" className="border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center justify-between gap-4 overflow-x-auto text-xs">
          <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 pr-3 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-emerald-600" /><span>Regional Price Index</span></div>
          <div className="flex shrink-0 items-center gap-6 font-mono">
            {ESTIMATED_PRICES.filter((item) => selectedKind === 'all' || item.kind === selectedKind).slice(0, 5).map((item) => <div key={item.commodity}><span className="block font-sans text-[10px] text-slate-400">{item.commodity}</span><span className="font-bold text-slate-900">KES {formatter.format(item.price)}</span></div>)}
          </div>
        </div>
      </Card>

      <Card padding="sm" className="border-slate-200 bg-white shadow-2xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative lg:col-span-2"><span className="sr-only">Search commodity</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crops or livestock..." className={`${selectClass} pl-10`} /></label>
          <label><span className="sr-only">Filter price type</span><select value={selectedKind} onChange={(event) => setSelectedKind(event.target.value as typeof selectedKind)} className={selectClass}><option value="all">Crops and livestock</option><option value="crop">Crops</option><option value="livestock">Livestock</option></select></label>
          <label><span className="sr-only">Filter by produce</span><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className={selectClass}><option value="all">All crop and livestock groups</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label><span className="sr-only">Filter by county</span><select value={selectedCounty} onChange={(event) => setSelectedCounty(event.target.value)} className={selectClass}><option value="all">All 47 counties</option>{KENYA_COUNTIES.map((county) => <option key={county} value={county}>{county}</option>)}</select></label>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">County comparison</p><h2 className="mt-1 font-display text-lg font-bold text-slate-900">Crop and livestock prices</h2></div>
        <div className="flex items-center gap-2 text-xs text-slate-500"><Coins className="h-4 w-4 text-amber-600" />KES · refreshes every 10 seconds · {rows.length} comparisons</div>
      </div>

      {rows.length === 0 ? <Card padding="lg" className="text-center text-sm text-slate-500">No prices match your filters.</Card> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => <Card key={`${row.county}-${row.commodity}`} padding="md" className="flex flex-col justify-between border-slate-200 bg-white shadow-xs transition hover:border-emerald-300">
            <div>
              <div className="mb-2 flex items-start justify-between gap-2"><span className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3.5 w-3.5 text-slate-400" />{row.county}</span><Badge variant={row.estimated ? 'warning' : 'forest'} size="sm">{row.estimated ? 'Estimated' : 'Published'}</Badge></div>
              <h3 className="text-sm font-bold leading-snug text-slate-900">{row.commodity}</h3>
              <div className="my-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><span className="block text-[10px] font-bold uppercase text-slate-500">Average price</span><span className="font-mono text-lg font-extrabold text-emerald-900">KES {formatter.format(row.average)}</span></div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="capitalize">{row.kind}</span><span>{row.date}</span></div>
          </Card>)}
        </div>
      )}
    </div>
  );
};
