import React, { useState } from 'react';
import { Copy, Check, Info, ShieldCheck, Palette, Sparkles } from 'lucide-react';
import { BRAND_COLORS, ColorToken } from '../../design-system/tokens';
import { Card } from '../../design-system/components/Card';
import { Badge } from '../../design-system/components/Badge';

export const ColorPaletteSection: React.FC = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const filteredColors =
    selectedFilter === 'all'
      ? BRAND_COLORS
      : BRAND_COLORS.filter((c) => c.category === selectedFilter);

  const categories = [
    { id: 'all', label: 'All Brand Colors' },
    { id: 'primary', label: 'Primary Greens' },
    { id: 'background', label: 'Surfaces & Canvas' },
    { id: 'accent', label: 'Harvest Accent' },
    { id: 'text', label: 'Typography' },
    { id: 'semantic', label: 'Semantic States' },
  ];

  return (
    <div className="space-y-10">
      {/* Header and 60-30-10 Distribution Rule */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              Official Brand Color Palette & Rules
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Engineered for outdoor readability on small smartphone screens in the Kenyan sun.
            </p>
          </div>
          {copiedHex && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-[#14532D] text-xs font-semibold border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Copied {copiedHex} to clipboard!</span>
            </div>
          )}
        </div>

        {/* 60-30-10 Brand Color Distribution Architecture */}
        <Card padding="md" className="border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#16A34A]" />
              <span>The 60-30-10 Architectural Balance</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Green remains the dominant visual authority
            </span>
          </div>

          <div className="w-full h-8 rounded-xl overflow-hidden flex border border-slate-200 shadow-xs mb-3">
            <div
              className="bg-[#F8FAFC] h-full flex items-center justify-center text-[11px] font-bold text-slate-700 transition-all border-r border-slate-200"
              style={{ width: '60%' }}
              title="60% Clean Canvas (Soft Background #F8FAFC & Pure White)"
            >
              60% Canvas & Card Surfaces
            </div>
            <div
              className="bg-[#14532D] h-full flex items-center justify-center text-[11px] font-bold text-white transition-all"
              style={{ width: '30%' }}
              title="30% Structural Green Anchors (Deep Forest #14532D & Primary Green #16A34A)"
            >
              30% Structural Greens
            </div>
            <div
              className="bg-[#F59E0B] h-full flex items-center justify-center text-[11px] font-bold text-slate-950 transition-all"
              style={{ width: '10%' }}
              title="10% Harvest Amber Accent & Alerts (#F59E0B)"
            >
              10% Amber
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-900 block mb-0.5">60% Canvas & Cards:</span>
              Soft Background (#F8FAFC) and Pure White (#FFFFFF) create daylight-legible content blocks with zero eye fatigue.
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <span className="font-semibold text-[#14532D] block mb-0.5">30% Brand Authority:</span>
              Deep Forest Green (#14532D) provides top navigation anchors, headers, and Primary Green (#16A34A) powers CTAs.
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
              <span className="font-semibold text-[#B45309] block mb-0.5">10% Harvest Accent:</span>
              Harvest Amber (#F59E0B) is budgeted strictly for price surges, frost warnings, and critical pest advisories.
            </div>
          </div>
        </Card>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedFilter === cat.id
                ? 'bg-[#14532D] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interactive Color Swatch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredColors.map((color) => {
          const isCopied = copiedHex === color.hex;

          return (
            <div
              key={color.name}
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all group"
            >
              {/* Swatch Header Box */}
              <div
                className="h-24 p-4 flex flex-col justify-between relative transition-transform"
                style={{ backgroundColor: color.hex }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                      color.textContrast === 'white'
                        ? 'bg-black/30 text-white'
                        : 'bg-white/80 text-slate-900'
                    }`}
                  >
                    {color.hex}
                  </span>

                  <button
                    onClick={() => handleCopy(color.hex)}
                    title="Click to copy HEX"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      color.textContrast === 'white'
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-slate-900'
                    }`}
                  >
                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium tracking-tight ${
                      color.textContrast === 'white' ? 'text-white/80' : 'text-slate-800/80'
                    }`}
                  >
                    {color.variable}
                  </span>
                </div>
              </div>

              {/* Swatch Details */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{color.name}</h4>
                  <Badge variant={color.category === 'primary' ? 'forest' : 'neutral'} size="sm">
                    {color.category}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{color.description}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <span className="font-semibold text-slate-700 shrink-0">Usage Rule:</span>
                    <span className="text-slate-600 leading-tight">{color.usageRule}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                    <span className="text-slate-500 font-mono">{color.wcagAARating}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Practical Do's and Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="border-emerald-200 bg-emerald-50/30">
          <h4 className="text-sm font-bold text-[#14532D] mb-2 flex items-center gap-2">
            <Check className="w-4 h-4 text-[#16A34A]" />
            <span>Official AgroLink Color Best Practices</span>
          </h4>
          <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <li>• Use Deep Forest Green (#14532D) for main headers, wordmarks, and structural anchors.</li>
            <li>• Use Primary Green (#16A34A) for primary interactive buttons and positive active states.</li>
            <li>• Use Warm Cream (#F5F5DC) as a selective tint for soil or farm advisory cards.</li>
            <li>• Use Harvest Amber (#F59E0B) with dark text to meet WCAG AA requirements.</li>
            <li>• Always test in bright daylight conditions to guarantee outdoor legibility for farmers.</li>
          </ul>
        </Card>

        <Card padding="md" className="border-red-200 bg-red-50/30">
          <h4 className="text-sm font-bold text-[#DC2626] mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-red-600" />
            <span>Strict Color Anti-Patterns</span>
          </h4>
          <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
            <li>• NEVER use Fresh Green (#86EFAC) as raw text color on white backgrounds (contrast failure).</li>
            <li>• NEVER signal crop or livestock risk by color alone; always pair with clear text or icons.</li>
            <li>• NEVER introduce random purples, cyans, or artificial neon gradients.</li>
            <li>• Do NOT flood whole screens with Warm Cream; use it sparingly to preserve modern clarity.</li>
            <li>• Avoid using every color equally; green is the core authoritative brand identity.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
