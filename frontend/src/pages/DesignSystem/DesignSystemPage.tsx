import React, { useState } from 'react';
import {
  Sprout,
  Palette,
  Type,
  LayoutGrid,
  Tractor,
  Layers,
  Coins,
} from 'lucide-react';
import { BrandIdentitySection } from '../../components/showcase/BrandIdentitySection';
import { ColorPaletteSection } from '../../components/showcase/ColorPaletteSection';
import { TypographySection } from '../../components/showcase/TypographySection';
import { ComponentPlayground } from '../../components/showcase/ComponentPlayground';
import { FarmerModulesShowcase } from '../../components/showcase/FarmerModulesShowcase';
import { ArchitectureDocs } from '../../components/showcase/ArchitectureDocs';
import { EcosystemCommercialSection } from '../../components/showcase/EcosystemCommercialSection';

export const DesignSystemPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('identity');

  const navigationSections = [
    { id: 'identity', label: 'Brand Identity', icon: Sprout },
    { id: 'colors', label: 'Color Palette & Rules', icon: Palette },
    { id: 'typography', label: 'Typography & Scale', icon: Type },
    { id: 'components', label: 'UI Component Library', icon: LayoutGrid },
    { id: 'modules', label: 'Agricultural Modules', icon: Tractor },
    { id: 'ecosystem', label: 'Business Model & Ecosystem', icon: Coins },
    { id: 'architecture', label: 'Architecture & DRF Blueprint', icon: Layers },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
          AgroLink Design System Workbench
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Complete reference documentation for tokens, color palette, typography, components, and
          Kenyan agricultural modules.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1.5 min-w-max" aria-label="Design System Sections">
          {navigationSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-[#86EFAC]' : 'text-slate-400'}`}
                />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Section Content */}
      <div className="transition-opacity duration-200">
        {activeSection === 'identity' && <BrandIdentitySection />}
        {activeSection === 'colors' && <ColorPaletteSection />}
        {activeSection === 'typography' && <TypographySection />}
        {activeSection === 'components' && <ComponentPlayground />}
        {activeSection === 'modules' && <FarmerModulesShowcase />}
        {activeSection === 'ecosystem' && <EcosystemCommercialSection />}
        {activeSection === 'architecture' && <ArchitectureDocs />}
      </div>
    </div>
  );
};
