import React, { useState } from 'react';
import { Type, Smartphone, AlignLeft, CheckCircle2 } from 'lucide-react';
import { TYPOGRAPHY_SCALE } from '../../design-system/tokens';
import { Card } from '../../design-system/components/Card';
import { MetadataRow } from '../../design-system/components/Badge';

export const TypographySection: React.FC = () => {
  const [customSample, setCustomSample] = useState(
    'Mavuno ya mahindi Nakuru: KES 4,850 kwa gunia la kilo 90.'
  );

  return (
    <div className="space-y-10">
      {/* Intro & Font Family Pairings */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
          Typography System & Hierarchy
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Engineered for high readability across low-cost Android smartphones and rugged tablets in
          harsh Kenyan daylight.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#14532D] block mb-1">
              Display & Branding Face
            </span>
            <h3 className="font-display text-xl font-bold text-slate-900 mb-1">
              Plus Jakarta Sans
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Geometric, warm, and contemporary. Delivers strong brand authority without feeling
              corporate or distant.
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-display font-bold text-[#14532D]">
              AgroLink: One Farmer. One Platform.
            </div>
          </Card>

          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A] block mb-1">
              Body & Interface Face
            </span>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Inter Sans
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Exceptional clarity at 12px–16px text sizes. High x-height ensures crisp reading in field
              conditions on mobile web.
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700">
              Apply DAP fertilizer at 50kg per acre during early rains.
            </div>
          </Card>

          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309] block mb-1">
              Data & Financial Numerals
            </span>
            <h3 className="text-xl font-bold font-mono text-slate-900 mb-1">
              Tabular Numerals
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Fixed-width numeric alignment prevents layout jitter in market price tables and sensor
              feeds.
            </p>
            <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-mono font-bold tabular-nums text-slate-900">
              KES 4,850 · 24.5 L/day · pH 6.4
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive Custom Text Previewer */}
      <Card padding="md" className="border-slate-200 bg-emerald-50/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <label htmlFor="typography-test-input" className="text-xs font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-4 h-4 text-[#16A34A]" />
            <span>Interactive Type Tester (Swahili & English Field Phrases)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCustomSample('Wakulima Market: Dry Maize wholesale at KES 4,800 / bag.')
              }
              className="text-xs text-[#16A34A] hover:underline font-medium cursor-pointer"
            >
              Maize Price
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() =>
                setCustomSample('Unamwagilia shamba la chai kesho asubuhi saa moja.')
              }
              className="text-xs text-[#16A34A] hover:underline font-medium cursor-pointer"
            >
              Swahili Alert
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() =>
                setCustomSample('Soil Nitrogen is 24 ppm (High) · Moisture 48% (Optimal)')
              }
              className="text-xs text-[#16A34A] hover:underline font-medium cursor-pointer"
            >
              Soil Stats
            </button>
          </div>
        </div>
        <input
          id="typography-test-input"
          type="text"
          value={customSample}
          onChange={(e) => setCustomSample(e.target.value)}
          placeholder="Type any phrase to preview in the typography scale..."
          className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
        />
      </Card>

      {/* Full Typography Scale Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900">Official AgroLink Scale</h3>

        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs divide-y divide-slate-100">
          {TYPOGRAPHY_SCALE.map((item) => (
            <div key={item.level} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#14532D] uppercase tracking-wide">
                    {item.level}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-mono">{item.size}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{item.family}</span>
                </div>
                <span className="text-xs text-slate-500 italic max-w-xs text-right">
                  {item.usage}
                </span>
              </div>

              {/* Rendered Sample */}
              <div className="mt-2 text-slate-900 break-words">
                <div className={item.token}>
                  {customSample || item.sample}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Pill Typography Showcase */}
      <Card padding="md" className="border-slate-200 bg-white">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-[#14532D] shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Zero-Pill Metadata Discipline in Practice
            </h4>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              We never trap informational agricultural metadata in candy pill badges. Metadata is
              presented as quiet, high-legibility inline text with typographic separators (·),
              leaving visual attention for important actions and alerts.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <MetadataRow
                items={[
                  'Plot 4A · 12.5 Acres',
                  'Last Soil Test: 3 days ago',
                  'Verified by KALRO Kitale',
                  'Next Irrigation: 06:00 AM',
                ]}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
