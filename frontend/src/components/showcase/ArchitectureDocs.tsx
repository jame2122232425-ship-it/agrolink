import React, { useState } from 'react';
import {
  Code,
  Layers,
  Server,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  FolderTree,
  Terminal,
} from 'lucide-react';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';

export const ArchitectureDocs: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const tailwindSnippet = `@import "tailwindcss";

@theme {
  /* AgroLink Official Brand Colors */
  --color-agro-forest: #14532D;      /* Deep Forest Green: Headings, branding anchors */
  --color-agro-primary: #16A34A;     /* Primary Green: Active buttons, indicators */
  --color-agro-fresh: #86EFAC;       /* Fresh Green: Subtle badge highlight */
  --color-agro-cream: #F5F5DC;       /* Warm Cream: Organic agricultural warmth */
  --color-agro-soft: #F8FAFC;        /* Soft Background: Daylight canvas */
  --color-agro-amber: #F59E0B;       /* Harvest Amber: Alerts & warning indicators */
  
  /* Text & Contrast */
  --color-agro-text-primary: #1E293B;
  --color-agro-text-secondary: #64748B;
  --color-agro-text-muted: #94A3B8;

  /* Semantic State */
  --color-agro-success: #16A34A;
  --color-agro-warning: #F59E0B;
  --color-agro-error: #DC2626;
  --color-agro-info: #2563EB;

  /* Typography */
  --font-display: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
}`;

  const componentTreeSnippet = `src/
├── design-system/                  # Reusable Design System Core
│   ├── tokens.ts                   # Brand Colors, Typography scales, Spacing math
│   └── components/
│       ├── Button.tsx              # Primary (#16A34A), Forest (#14532D), Amber (#F59E0B)
│       ├── Card.tsx                # Single-elevation surfaces, cream/forest variants
│       ├── Badge.tsx               # Status badges + Zero-pill MetadataRow
│       ├── Input.tsx               # Form Input, SearchInput, KES Currency, +254 Phone
│       ├── Select.tsx              # Mobile-first dropdown selector
│       ├── Alert.tsx               # Weather warnings & advisory banners
│       ├── Modal.tsx               # Accessible dialogs with backdrop blur
│       ├── MetricCard.tsx          # Tabular numerals with trend comparisons
│       ├── Tabs.tsx                # Pill-free segmented controls & underline tabs
│       └── EmptyState.tsx          # Resilient empty & loading skeleton states
│
├── components/
│   ├── navigation/
│   │   ├── AgroLinkHeader.tsx      # Top Bar Contract (Wordmark · Links · Action)
│   │   ├── AgroLinkSidebar.tsx     # Desktop dashboard sidebar
│   │   └── AgroLinkMobileNav.tsx   # Mobile 44px thumb-zone bottom navigation bar
│   ├── modules/                    # Domain modules (Crops, Livestock, Soil, Markets)
│   │   ├── CropManager.tsx
│   │   ├── DairyTracker.tsx
│   │   ├── SoilClimateHub.tsx
│   │   └── MarketPriceBoard.tsx
│   └── advisory/
│       └── AgronomistDirectory.tsx # Certified KALRO extension officer booking
│
└── services/                       # Ready for Django REST Framework APIs
    ├── api.ts                      # Axios/Fetch client with Bearer auth
    ├── crops.service.ts
    ├── livestock.service.ts
    └── market.service.ts`;

  const djangoRestSnippet = `# Django REST Framework Serializers Blueprint
# backend/agrolink/farmers/serializers.py

from rest_framework import serializers
from .models import FarmPlot, CropCycle, SoilTest, LivestockHerd

class SoilTestSerializer(serializers.ModelSerializer):
    """Encapsulates NPK soil chemistry and pH telemetry"""
    class Meta:
        model = SoilTest
        fields = ['id', 'plot_id', 'ph_level', 'nitrogen_ppm', 
                  'phosphorus_ppm', 'potassium_ppm', 'moisture_percentage', 
                  'tested_at', 'extension_officer_verified']

class CropCycleSerializer(serializers.ModelSerializer):
    """Maps Kenyan crop growth stages and satellite NDVI"""
    soil_tests = SoilTestSerializer(many=True, read_only=True)
    expected_harvest_kes = serializers.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model = CropCycle
        fields = ['id', 'farmer_id', 'crop_type', 'variety', 
                  'acres_planted', 'planting_date', 'growth_stage', 
                  'ndvi_satellite_index', 'expected_harvest_kes', 'soil_tests']`;

  return (
    <div className="space-y-10">
      {/* Intro */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
          Technical Architecture & Integration Blueprints
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Everything the frontend and backend engineering teams need to implement AgroLink consistently,
          ready for Django REST Framework integration.
        </p>
      </div>

      {/* 1. Responsive Design Principles */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#16A34A]" />
          <span>1. Responsive Design Principles for Kenyan Agriculture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold text-[#14532D] uppercase tracking-wider block mb-1">
              Mobile-First Thumb Ergonomics
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every interactive element maintains a minimum touch hitbox of <strong>44×44px</strong>.
              Primary navigation anchors to the bottom 40% thumb zone on smartphones.
            </p>
          </Card>

          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider block mb-1">
              Zero Horizontal Overflow
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tables scroll gracefully within contained borders. Metric cards wrap into 2-column or
              single-column grids with <strong>16px standard edge margins</strong> on smartphones.
            </p>
          </Card>

          <Card padding="md" className="border-slate-200 bg-white">
            <span className="text-[11px] font-bold text-[#B45309] uppercase tracking-wider block mb-1">
              15% Sticky Surface Budget
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Combined height of the mobile top bar and bottom navigation never exceeds 15% of the
              vertical screen, leaving 85%+ open for crop feeds and market data.
            </p>
          </Card>
        </div>
      </div>

      {/* 2. Reusable Tailwind CSS Theme */}
      <Card padding="md" className="border-slate-200 bg-slate-900 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-[#86EFAC]" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              2. Reusable Tailwind CSS v4 Theme Configuration
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(tailwindSnippet, 'tailwind')}
            className="text-slate-300 hover:text-white hover:bg-white/10"
            leftIcon={copiedKey === 'tailwind' ? <Check className="w-3.5 h-3.5 text-[#86EFAC]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedKey === 'tailwind' ? 'Copied' : 'Copy Theme'}
          </Button>
        </div>
        <pre className="p-4 bg-slate-950/80 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed border border-slate-800">
          <code>{tailwindSnippet}</code>
        </pre>
      </Card>

      {/* 3. Proposed React Component Tree */}
      <Card padding="md" className="border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[#14532D]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              3. Proposed Frontend React Architecture
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(componentTreeSnippet, 'tree')}
            leftIcon={copiedKey === 'tree' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copiedKey === 'tree' ? 'Copied' : 'Copy Structure'}
          </Button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Atomic directory layout separating design system primitives from farmer domain screens.
        </p>
        <pre className="p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed border border-slate-200">
          <code>{componentTreeSnippet}</code>
        </pre>
      </Card>

      {/* 4. Django REST Framework Blueprint */}
      <Card padding="md" className="border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#16A34A]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              4. Django REST Framework API Contract Preparation
            </h3>
          </div>
          <Badge variant="forest">Decoupled Architecture</Badge>
        </div>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          The farmer-facing React application is completely decoupled from the Django officer
          dashboard, communicating strictly via clean REST API endpoints (`/api/v1/`).
        </p>
        <pre className="p-4 bg-slate-50 rounded-xl text-xs font-mono text-slate-800 overflow-x-auto leading-relaxed border border-slate-200">
          <code>{djangoRestSnippet}</code>
        </pre>
      </Card>
    </div>
  );
};
