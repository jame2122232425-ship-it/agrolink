import React, { useState } from 'react';
import { Sprout, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '../../design-system/components/Button';

export interface AgroLinkHeaderProps {
  activeSection?: string;
  onNavigate?: (section: string) => void;
}

export const AgroLinkHeader: React.FC<AgroLinkHeaderProps> = ({
  activeSection = 'overview',
  onNavigate,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'overview', label: 'Platform' },
    { id: 'crops', label: 'Crop Intelligence' },
    { id: 'livestock', label: 'Livestock & Dairy' },
    { id: 'soil', label: 'Soil & Climate' },
    { id: 'markets', label: 'Wakulima Markets' },
  ];

  const handleLinkClick = (id: string) => {
    onNavigate?.(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single Brand Wordmark Element */}
        <div
          onClick={() => handleLinkClick('overview')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#14532D] text-white flex items-center justify-center shadow-xs group-hover:bg-[#16A34A] transition-colors">
            <Sprout className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-tight text-[#14532D] leading-none">
              Agro<span className="text-[#16A34A]">Link</span>
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 Concise Single-Line Text Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
                activeSection === link.id
                  ? 'border-[#16A34A] text-[#14532D] font-semibold'
                  : 'border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="forest"
            size="sm"
            onClick={() => onNavigate?.('playground')}
            className="hidden sm:inline-flex"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Farmer Portal
          </Button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation menu"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === link.id
                    ? 'bg-emerald-50 text-[#14532D] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Button
              variant="forest"
              size="md"
              fullWidth
              onClick={() => {
                onNavigate?.('playground');
                setMobileMenuOpen(false);
              }}
            >
              Access Farmer Portal
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
