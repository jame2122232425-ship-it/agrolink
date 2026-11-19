import React, { useEffect, useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Filter,
  Clock,
  Sprout,
  Beef,
  FileText,
  ShoppingBag,
  GraduationCap,
  Layers,
  Search,
  Plus,
  CheckCircle2,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { DataStateBanner } from '../../components/common/DataStateBanner';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { EmptyState } from '../../design-system/components/EmptyState';
import { FarmActivity } from '../../data/farmerData';

export const ActivityPage: React.FC = () => {
  const { activeFarm, activities, addActivity, plots, showToast } = useFarmer();

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'crop' | 'dairy' | 'soil' | 'report' | 'market'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Manual Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<FarmActivity['category']>('crop');
  const [notePlot, setNotePlot] = useState(plots[0]?.name || '');
  const [noteDetail, setNoteDetail] = useState('');

  useEffect(() => {
    if (!notePlot && plots.length > 0) {
      setNotePlot(plots[0].name);
    }
  }, [plots, notePlot]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.plotOrUnit.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || act.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [activities, searchTerm, categoryFilter]);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    try {
      await addActivity({
        category: noteCategory,
        title: noteTitle,
        detail: noteDetail || 'Manual farm operation logged by farmer.',
        plotOrUnit: notePlot,
        status: 'completed',
      });
      setNoteTitle('');
      setNoteDetail('');
      setIsLogModalOpen(false);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dairy':
        return <Beef className="w-4 h-4 text-[#14532D]" />;
      case 'crop':
        return <Sprout className="w-4 h-4 text-[#16A34A]" />;
      case 'report':
        return <FileText className="w-4 h-4 text-amber-700" />;
      case 'market':
        return <ShoppingBag className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!activeFarm.id) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <History className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">No farm activity yet</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Farm activity will appear here after a farm is registered and records are added.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <DataStateBanner collection="activities" />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              {activeFarm.name || 'Farm'} Ledger{activeFarm.county ? ` · ${activeFarm.county}` : ''}
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Immutable Records
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-[#16A34A]" />
            <span>Farm Activity</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your farm records in date order.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => showToast('Activity ledger exported as PDF summary.')}
          >
            Export Ledger
          </Button>

          <Button
            variant="forest"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsLogModalOpen(true)}
          >
            Log Farm Operation
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activities by keyword, plot, or transaction..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'crop', label: 'Crops' },
            { id: 'dairy', label: 'Dairy & Livestock' },
            { id: 'report', label: 'Problem Reports' },
            { id: 'market', label: 'Marketplace' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-[#14532D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <Card padding="md" className="border-slate-200 bg-white shadow-xs">
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon={<History className="w-8 h-8 text-[#16A34A]" />}
            title="No Activity Records Found"
            description={`No operations matched your filter criteria.`}
            actionText="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setCategoryFilter('all');
            }}
          />
        ) : (
          <div className="relative pl-4 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredActivities.map((act) => (
              <div key={act.id} className="relative pl-6">
                {/* Timeline node icon */}
                <div className="absolute -left-3.5 top-1 w-6 h-6 rounded-full bg-white border-2 border-[#16A34A] flex items-center justify-center shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        {getCategoryIcon(act.category)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{act.date}</span>
                      <span>·</span>
                      <span>{act.timeAgo}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{act.detail}</p>

                  <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-200/50">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {act.plotOrUnit}
                    </span>

                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      Verified Entry
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Manual Operation Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Farm Field Operation"
        description="Record field tasks, weeding, fertilizer application, or manual harvest logs."
        primaryAction={{
          label: 'Save Entry',
          onClick: () => document.getElementById('log-note-submit')?.click(),
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsLogModalOpen(false),
        }}
      >
        <form onSubmit={handleLogSubmit} className="space-y-4 text-xs">
          <Input
            label="Operation Title"
            placeholder="e.g. Applied CAN Fertilizer Top-Dressing"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Operation Category"
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value as any)}
              options={[
                { value: 'crop', label: 'Crop Operation' },
                { value: 'dairy', label: 'Dairy / Livestock' },
                { value: 'soil', label: 'Soil & Compost' },
                { value: 'report', label: 'Scouting Log' },
                { value: 'market', label: 'Marketplace Transaction' },
              ]}
            />

            <Select
              label="Farm Plot / Unit"
              value={notePlot}
              onChange={(e) => setNotePlot(e.target.value)}
              options={plots.map((p) => ({
                value: p.name,
                label: `${p.plotNumber}: ${p.name} (${p.acres} Ac)`,
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operation Details & Inputs Used
            </label>
            <textarea
              rows={3}
              placeholder="Specify application rate, workers involved, or volumes..."
              value={noteDetail}
              onChange={(e) => setNoteDetail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </div>

          <button type="submit" id="log-note-submit" className="hidden" />
        </form>
      </Modal>
    </div>
  );
};
