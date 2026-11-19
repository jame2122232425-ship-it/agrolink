import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit3,
  Trash2,
  Clock,
  ArrowRight,
  TrendingUp,
  Droplet,
  Layers,
  ShieldAlert,
  Info,
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
import { CropRecord } from '../../data/farmerData';

export const CropsPage: React.FC = () => {
  const { activeFarm, crops, addCrop, updateCrop, deleteCrop, plots } = useFarmer();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'observation' | 'attention'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<CropRecord | null>(null);
  const [viewingCrop, setViewingCrop] = useState<CropRecord | null>(null);
  const [cropToDelete, setCropToDelete] = useState<CropRecord | null>(null);

  // Add Crop Form State
  const [name, setName] = useState('Maize');
  const [variety, setVariety] = useState('Western Hybrid H513');
  const [plotName, setPlotName] = useState(plots[0]?.name || 'Plot 1 (Main Field)');
  const [acres, setAcres] = useState('1.0');
  const [plantedDate, setPlantedDate] = useState('Oct 20, 2026');
  const [growthStage, setGrowthStage] = useState('Vegetative Growth');
  const [progressPercent, setProgressPercent] = useState('35');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'observation' | 'attention'>('healthy');
  const [expectedHarvest, setExpectedHarvest] = useState('Jan 15–22, 2027');
  const [projectedYield, setProjectedYield] = useState('25 Bags (90kg)');

  // Filtered crops
  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      const matchesSearch =
        crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.variety.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crop.plotName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || crop.healthStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [crops, searchTerm, statusFilter]);

  // Handle Add Crop
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const colorMap: Record<string, string> = {
      Maize: '#16A34A',
      Beans: '#F59E0B',
      Tomatoes: '#DC2626',
      Kale: '#059669',
    };

    try {
      await addCrop({
        name,
        variety,
        plotName,
        acres: parseFloat(acres) || 1.0,
        plantedDate,
        growthStage,
        progressPercent: parseInt(progressPercent, 10) || 50,
        healthStatus,
        healthScore: healthStatus === 'healthy' ? 95 : healthStatus === 'observation' ? 82 : 68,
        expectedHarvest,
        projectedYield,
        color: colorMap[name] || '#16A34A',
      });
      setIsAddModalOpen(false);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  // Handle Edit Crop
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrop) return;

    try {
      await updateCrop(editingCrop.id, {
        name: editingCrop.name,
        variety: editingCrop.variety,
        plotName: editingCrop.plotName,
        acres: editingCrop.acres,
        growthStage: editingCrop.growthStage,
        progressPercent: editingCrop.progressPercent,
        healthStatus: editingCrop.healthStatus,
        expectedHarvest: editingCrop.expectedHarvest,
        projectedYield: editingCrop.projectedYield,
      });
      setEditingCrop(null);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  // Total acreage of crops
  const totalCropAcres = crops.reduce((acc, c) => acc + c.acres, 0).toFixed(1);
  const averageCropHealth = crops.length
    ? Math.round(crops.reduce((total, crop) => total + crop.healthScore, 0) / crops.length)
    : null;
  const cropsWithHarvestDate = crops.filter((crop) => crop.expectedHarvest).length;

  if (!activeFarm.id) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <Sprout className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">No farm registered</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Crop records will be available after a farm is registered to this account.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <DataStateBanner collection="crops" />
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Busia County Agro-Ecological Management
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Cultivation Registry
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sprout className="w-7 h-7 text-[#16A34A]" />
            <span>Crop Management Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Planting records, growth stage milestones, field health scouting, and projected harvest volumes.
          </p>
        </div>

        <Button
          variant="forest"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Crop Record
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm" className="bg-white border-slate-200/90">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Cultivated Land
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalCropAcres}</span>
            <span className="text-xs text-slate-500 font-medium">Acres</span>
          </div>
          <span className="text-[11px] text-slate-500">{crops.length} crop records</span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200/90">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Active Crops
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{crops.length}</span>
            <span className="text-xs text-slate-500 font-medium">Varieties</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {crops.length ? [...new Set(crops.map((crop) => crop.name))].join(', ') : 'No crop records yet'}
          </span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200/90">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Overall Crop Vigor
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-[#16A34A]">
              {averageCropHealth === null ? '—' : `${averageCropHealth}%`}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {averageCropHealth === null ? 'No data' : 'Average'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {crops.filter((crop) => crop.healthStatus === 'observation').length} under observation
          </span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200/90">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Next Harvest Window
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-amber-700">{cropsWithHarvestDate}</span>
            <span className="text-xs text-slate-500 font-medium">Dates recorded</span>
          </div>
          <span className="text-[11px] text-slate-500">Expected harvest dates</span>
        </Card>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search crops by name, hybrid variety, or plot location..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden lg:inline">
            Status:
          </span>
          {[
            { id: 'all', label: 'All Crops' },
            { id: 'healthy', label: 'Healthy' },
            { id: 'observation', label: 'Under Observation' },
            { id: 'attention', label: 'Needs Attention' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[#14532D] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Crops Cards Grid */}
      {filteredCrops.length === 0 ? (
        <EmptyState
          icon={<Sprout className="w-8 h-8 text-[#16A34A]" />}
          title="No Crops Found Matching Filter"
          description={
            searchTerm
              ? `No crops matched "${searchTerm}". Try adjusting your keywords or clearing the filter.`
              : 'No crop records available in this category. Click Add Crop Record to register a new crop.'
          }
          actionText={searchTerm ? 'Reset Search' : 'Add First Crop'}
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('all');
            if (!searchTerm) setIsAddModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCrops.map((crop) => {
            const isObservation = crop.healthStatus === 'observation';
            const isAttention = crop.healthStatus === 'attention';

            return (
              <Card
                key={crop.id}
                padding="md"
                className={`bg-white transition-all flex flex-col justify-between border ${
                  isAttention
                    ? 'border-red-300 shadow-sm'
                    : isObservation
                    ? 'border-amber-300 shadow-xs'
                    : 'border-slate-200 shadow-xs hover:border-emerald-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{crop.name}</h3>
                        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {crop.variety}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                        <Layers className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>{crop.plotName}</span>
                        <span className="text-slate-300">·</span>
                        <span>{crop.acres} Acres</span>
                      </p>
                    </div>

                    {/* Status badge */}
                    {isAttention ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                        Needs Attention
                      </span>
                    ) : isObservation ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Under Observation
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Healthy ({crop.healthScore}%)
                      </span>
                    )}
                  </div>

                  {/* Growth Progress Bar */}
                  <div className="my-3 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Stage: <strong>{crop.growthStage}</strong></span>
                      </span>
                      <span className="font-mono font-bold text-slate-900">{crop.progressPercent}%</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${crop.progressPercent}%`,
                          backgroundColor: crop.color,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Planted: {crop.plantedDate}</span>
                      <span>Target: {crop.expectedHarvest}</span>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Projected Harvest Yield
                      </span>
                      <span className="text-sm font-bold font-mono text-[#14532D]">
                        {crop.projectedYield}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Expected Harvest Window
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {crop.expectedHarvest}
                      </span>
                    </div>
                  </div>

                  {/* Observation notice if any */}
                  {isObservation && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Field observation note: Suspected lower leaf fungal spot under observation.
                        <em> Qualified laboratory or officer diagnosis required before commercial fungicide purchase.</em>
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingCrop(crop)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => setEditingCrop(crop)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setCropToDelete(crop)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Archive Crop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Advisory Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-slate-900">AgroLink Plant Pathology Standard:</strong>
          <p className="leading-relaxed text-slate-700">
            Automated image analysis and agronomic triage provides initial guidance only. Official confirmation of plant quarantine diseases
            (such as Maize Lethal Necrosis or Bacterial Wilt) is subject to physical verification by accredited sub-county extension officers or KALRO stations.
          </p>
        </div>
      </div>

      {/* Modal 1: Add Crop Record */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Crop Cycle"
        description="Register a planting cycle on your farm plots."
        primaryAction={{
          label: 'Save Crop Record',
          onClick: () => document.getElementById('add-crop-submit')?.click(),
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsAddModalOpen(false),
        }}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Crop Name"
              placeholder="e.g. Maize, Beans, Tomatoes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Variety / Hybrid"
              placeholder="e.g. H513, Rosecoco GLP-2"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Target Field Plot"
              value={plotName}
              onChange={(e) => setPlotName(e.target.value)}
              options={plots.map((p) => ({
                value: p.name,
                label: `${p.plotNumber}: ${p.name} (${p.acres} Ac)`,
              }))}
            />
            <Input
              label="Planted Acres"
              type="number"
              step="0.1"
              value={acres}
              onChange={(e) => setAcres(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Planted Date"
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
              required
            />
            <Input
              label="Growth Stage"
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Cycle Progress (%)"
              type="number"
              min="0"
              max="100"
              value={progressPercent}
              onChange={(e) => setProgressPercent(e.target.value)}
              required
            />
            <Select
              label="Condition"
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value as any)}
              options={[
                { value: 'healthy', label: 'Healthy' },
                { value: 'observation', label: 'Under Observation' },
                { value: 'attention', label: 'Needs Attention' },
              ]}
            />
            <Input
              label="Projected Yield"
              placeholder="e.g. 35 Bags"
              value={projectedYield}
              onChange={(e) => setProjectedYield(e.target.value)}
              required
            />
          </div>

          <Input
            label="Expected Harvest Period"
            value={expectedHarvest}
            onChange={(e) => setExpectedHarvest(e.target.value)}
            required
          />

          <button type="submit" id="add-crop-submit" className="hidden" />
        </form>
      </Modal>

      {/* Modal 2: Edit Crop Record */}
      {editingCrop && (
        <Modal
          isOpen={!!editingCrop}
          onClose={() => setEditingCrop(null)}
          title={`Edit ${editingCrop.name} (${editingCrop.variety})`}
          description="Update growth milestone, health status, or yield forecasts."
          primaryAction={{
            label: 'Save Changes',
            onClick: () => document.getElementById('edit-crop-submit')?.click(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setEditingCrop(null),
          }}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Crop Name"
                value={editingCrop.name}
                onChange={(e) => setEditingCrop({ ...editingCrop, name: e.target.value })}
                required
              />
              <Input
                label="Variety"
                value={editingCrop.variety}
                onChange={(e) => setEditingCrop({ ...editingCrop, variety: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Growth Stage"
                value={editingCrop.growthStage}
                onChange={(e) => setEditingCrop({ ...editingCrop, growthStage: e.target.value })}
                required
              />
              <Input
                label="Cycle Progress (%)"
                type="number"
                min="0"
                max="100"
                value={editingCrop.progressPercent.toString()}
                onChange={(e) =>
                  setEditingCrop({
                    ...editingCrop,
                    progressPercent: parseInt(e.target.value, 10) || 0,
                  })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Crop Condition"
                value={editingCrop.healthStatus}
                onChange={(e) => setEditingCrop({ ...editingCrop, healthStatus: e.target.value as any })}
                options={[
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'observation', label: 'Under Observation' },
                  { value: 'attention', label: 'Needs Attention' },
                ]}
              />
              <Input
                label="Projected Yield"
                value={editingCrop.projectedYield}
                onChange={(e) => setEditingCrop({ ...editingCrop, projectedYield: e.target.value })}
                required
              />
            </div>

            <Input
              label="Expected Harvest"
              value={editingCrop.expectedHarvest}
              onChange={(e) => setEditingCrop({ ...editingCrop, expectedHarvest: e.target.value })}
              required
            />

            <button type="submit" id="edit-crop-submit" className="hidden" />
          </form>
        </Modal>
      )}

      {/* Modal 3: View Crop Details */}
      {viewingCrop && (
        <Modal
          isOpen={!!viewingCrop}
          onClose={() => setViewingCrop(null)}
          title={`${viewingCrop.name} (${viewingCrop.variety}) — Agronomic Dossier`}
          description={`Registered on ${viewingCrop.plotName} · Planted ${viewingCrop.plantedDate}`}
          primaryAction={{
            label: 'Close Dossier',
            onClick: () => setViewingCrop(null),
          }}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Field Parcel</span>
                <span className="font-bold text-slate-900">{viewingCrop.plotName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Land Allocated</span>
                <span className="font-bold text-slate-900 font-mono">{viewingCrop.acres} Acres</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Planted Date</span>
                <span className="font-bold text-slate-900">{viewingCrop.plantedDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Projected Yield</span>
                <span className="font-bold text-emerald-800 font-mono">{viewingCrop.projectedYield}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Phenological Development</h4>
              <p className="text-slate-600 leading-relaxed">
                Currently in the <strong>{viewingCrop.growthStage}</strong> phase ({viewingCrop.progressPercent}% to physiological maturity).
                Nutrient uptake demand is peaking. Rainfall in Samia is currently meeting evapotranspiration requirements.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-slate-900">Recommended Agricultural Activities</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Verify perimeter trench drainage prior to afternoon showers.</li>
                <li>Scout lower leaves for early fungal or pest signs twice weekly.</li>
                <li>Maintain weed competition below 10% canopy cover.</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 4: Delete Confirmation */}
      {cropToDelete && (
        <Modal
          isOpen={!!cropToDelete}
          onClose={() => setCropToDelete(null)}
          title="Archive Crop Cycle?"
          description={`Are you sure you want to archive "${cropToDelete.name} (${cropToDelete.variety})" from your active field ledger?`}
          primaryAction={{
            label: 'Confirm Archive',
            variant: 'danger',
            onClick: () => {
              setCropToDelete(null);
              void deleteCrop(cropToDelete.id).catch(() => undefined);
            },
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setCropToDelete(null),
          }}
        >
          <div className="text-xs text-slate-600 p-2">
            This will archive the record from active dashboard views and record an archival entry in your Farm Activity Ledger.
          </div>
        </Modal>
      )}
    </div>
  );
};
