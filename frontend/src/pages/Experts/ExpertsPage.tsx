import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  Calendar,
  Phone,
  Star,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { EmptyState } from '../../design-system/components/EmptyState';
import { ExpertProfile } from '../../data/farmerData';
import { mockApiService } from '../../services/mockApiService';

export const ExpertsPage: React.FC = () => {
  const { farmer, activeFarm, plots, showToast } = useFarmer();
  const [experts] = useState<ExpertProfile[]>([]);

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [bookingExpert, setBookingExpert] = useState<ExpertProfile | null>(null);
  const [viewingExpert, setViewingExpert] = useState<ExpertProfile | null>(null);

  // Booking Form State
  const [selectedService, setSelectedService] = useState('');
  const [targetPlot, setTargetPlot] = useState(plots[0]?.name || 'Plot 1: Main Field');
  const [preferredDate, setPreferredDate] = useState('Nov 14, 2026 (Friday)');
  const [issueNotes, setIssueNotes] = useState('Routine inspection & soil nutrient advice for upcoming planting cycle.');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Filtered experts
  const filteredExperts = experts.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.shortBio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.areaServed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'all' || exp.category === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  // Handle Book Submit
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingExpert) return;

    setIsSubmittingBooking(true);
    try {
      await mockApiService.requestExpertService({
        expertId: bookingExpert.id,
        expertName: bookingExpert.name,
        farmerName: farmer.fullName,
        serviceType: selectedService || bookingExpert.exampleServices[0]?.service || 'General Farm Advisory',
        farmPlotOrUnit: targetPlot,
        preferredDate,
        issueDescription: issueNotes,
      });

      showToast(`Demonstration consultation request logged for ${bookingExpert.name}.`);
      setBookingExpert(null);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Professional Advisory Directory · Western Kenya
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Demonstration Profiles
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-[#14532D]" />
            <span>Find an Expert</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Find local help for crops, soil, and livestock.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
          <MapPin className="w-4 h-4 text-[#16A34A]" />
          <span>Covering Busia, Kakamega & Siaya</span>
        </div>
      </div>

      {/* Scope Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="block">Demonstration Directory & Service Requests:</strong>
          <span className="text-amber-900 leading-relaxed">
            The profiles and service fees shown below are illustrative demonstration examples. In production, real professional credential verification,
            Kenya Veterinary Board / KMD licensing checks, and secure booking escrows will be handled by the Django backend.
          </span>
        </div>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, skill, or area"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'All Specialists' },
            { id: 'Veterinary Professional', label: 'Veterinary' },
            { id: 'Agronomist', label: 'Agronomy' },
            { id: 'Soil Testing Specialist', label: 'Soil Testing' },
            { id: 'Extension Consultant', label: 'Extension' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedSpecialty(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSpecialty === cat.id
                  ? 'bg-[#14532D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experts Grid */}
      {filteredExperts.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8 text-[#16A34A]" />}
          title="No Agricultural Professionals Found"
          description={`No expert profiles matched "${searchTerm}". Try adjusting your keywords or clearing the category filter.`}
          actionText="Reset Search"
          onAction={() => {
            setSearchTerm('');
            setSelectedSpecialty('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExperts.map((exp) => (
            <Card
              key={exp.id}
              padding="md"
              className="bg-white border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">{exp.name}</h3>
                    <span className="text-xs font-semibold text-emerald-800 block">{exp.title}</span>
                  </div>
                  <Badge variant="forest" size="sm">
                    {exp.category}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 my-2 text-xs">
                  <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{exp.rating}</span>
                    <span className="text-slate-400 font-normal">({exp.reviewsCount} reviews)</span>
                  </span>

                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{exp.areaServed}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {exp.shortBio}
                </p>

                {/* Example Services & Estimated Rates */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Example Service Guidelines & Estimated Fees:
                  </span>
                  {exp.exampleServices.map((svc, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-[11px] text-slate-700">
                      <span className="truncate pr-2">• {svc.service}</span>
                      <span className="font-mono font-bold text-[#14532D] shrink-0">
                        {svc.estimatedFee}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{exp.demonstrationAvailability}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Phone: {exp.phone}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingExpert(exp)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    View Bio
                  </button>
                  <Button
                    variant="forest"
                    size="sm"
                    onClick={() => {
                      setSelectedService(exp.exampleServices[0]?.service || '');
                      setBookingExpert(exp);
                    }}
                  >
                    Request Booking
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Request Expert Consultation */}
      {bookingExpert && (
        <Modal
          isOpen={!!bookingExpert}
          onClose={() => setBookingExpert(null)}
          title={`Request Consultation: ${bookingExpert.name}`}
          description={`${bookingExpert.title} · ${bookingExpert.areaServed}`}
          primaryAction={{
            label: 'Submit Booking Request (Demo)',
            onClick: () => document.getElementById('expert-book-submit')?.click(),
            isLoading: isSubmittingBooking,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setBookingExpert(null),
          }}
        >
          <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
            <Select
              label="Select Advisory Service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              options={bookingExpert.exampleServices.map((s) => ({
                value: s.service,
                label: `${s.service} (${s.estimatedFee})`,
              }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Target Farm Plot / Unit"
                value={targetPlot}
                onChange={(e) => setTargetPlot(e.target.value)}
                options={plots.map((p) => ({
                  value: `${p.plotNumber}: ${p.name}`,
                  label: `${p.plotNumber}: ${p.name} (${p.acres} Ac)`,
                }))}
              />
              <Input
                label="Preferred Visit Date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Describe What You Need the Specialist to Inspect
              </label>
              <textarea
                rows={3}
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="e.g. Tomato leaf spot diagnosis, soil nutrient recommendations, livestock feeding ration..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
                required
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px]">
              Note: This is a demonstration interaction. Submitting creates a pending request entry in your Farm Activity Ledger without external payment or SMS dispatch.
            </div>

            <button type="submit" id="expert-book-submit" className="hidden" />
          </form>
        </Modal>
      )}

      {/* Modal 2: View Expert Bio & Qualifications */}
      {viewingExpert && (
        <Modal
          isOpen={!!viewingExpert}
          onClose={() => setViewingExpert(null)}
          title={viewingExpert.name}
          description={viewingExpert.title}
          primaryAction={{
            label: 'Close Bio',
            onClick: () => setViewingExpert(null),
          }}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Specialty Category</span>
                <span className="font-bold text-slate-900">{viewingExpert.category}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Coverage Zone</span>
                <span className="font-bold text-slate-900">{viewingExpert.areaServed}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Contact Line</span>
                <span className="font-bold text-slate-900 font-mono">{viewingExpert.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Demonstration Rating</span>
                <span className="font-bold text-amber-800">{viewingExpert.rating} / 5.0 ({viewingExpert.reviewsCount} reviews)</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Professional Background:</span>
              <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {viewingExpert.shortBio}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
              <span className="font-bold text-slate-800 block mb-1">Standard Offerings:</span>
              <ul className="list-disc pl-4 space-y-1">
                {viewingExpert.exampleServices.map((s, idx) => (
                  <li key={idx}>
                    {s.service} — <strong className="font-mono text-[#14532D]">{s.estimatedFee}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
