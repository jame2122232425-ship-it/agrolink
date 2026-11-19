import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Trees,
  Plus,
  ArrowLeft,
  MapPin,
  Layers,
  FileText,
  ChevronRight,
  Edit3,
  Calendar,
  CheckCircle2,
  Droplet,
  Sprout,
  Beef,
  Activity,
  AlertTriangle,
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
import { FarmPlot } from '../../data/farmerData';

export const FarmPage: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const {
    farmer,
    activeFarm: currentActiveFarm,
    farms,
    farmsLoading,
    switchFarm,
    updateActiveFarm,
    plots,
    addPlot,
    updatePlot,
    crops,
    livestock,
  } = useFarmer();
  const selectedFarm = farms.find((farm) => farm.id === farmId);
  const activeFarm = selectedFarm ?? currentActiveFarm;
  const farmPlots = plots.filter((plot) => plot.farmId === activeFarm.id);

  useEffect(() => {
    if (selectedFarm && selectedFarm.id !== currentActiveFarm.id) {
      switchFarm(selectedFarm.id);
    }
  }, [currentActiveFarm.id, selectedFarm?.id, switchFarm]);

  // Modals state
  const [isEditFarmModalOpen, setIsEditFarmModalOpen] = useState(false);
  const [isAddPlotModalOpen, setIsAddPlotModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState<FarmPlot | null>(null);

  // Edit Farm Form State
  const [farmName, setFarmName] = useState(activeFarm.name);
  const [farmLocation, setFarmLocation] = useState(activeFarm.location);
  const [farmEnterprise, setFarmEnterprise] = useState(activeFarm.primaryEnterprise);
  const [farmSoil, setFarmSoil] = useState(activeFarm.soilType);
  const [farmAcres, setFarmAcres] = useState(activeFarm.totalAcres.toString());

  // Add Plot Form State
  const [plotNumber, setPlotNumber] = useState('Plot 1');
  const [plotName, setPlotName] = useState('');
  const [plotAcres, setPlotAcres] = useState('0.5');
  const [plotEnterprise, setPlotEnterprise] = useState<'crops' | 'livestock'>('crops');
  const [plotCrop, setPlotCrop] = useState('Maize');
  const [plotVariety, setPlotVariety] = useState('H513');
  const [plotSpecies, setPlotSpecies] = useState('Cattle');
  const [plotBreed, setPlotBreed] = useState('');
  const [plotAnimalCount, setPlotAnimalCount] = useState('1');
  const [plotSoilPh, setPlotSoilPh] = useState('6.3');
  const [plotIrrigation, setPlotIrrigation] = useState<'Rainfed' | 'Drip Irrigation' | 'Furrow / Trench'>('Rainfed');
  const [plotNotes, setPlotNotes] = useState('');

  // Handle Edit Farm
  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    updateActiveFarm({
      name: farmName,
      location: farmLocation,
      primaryEnterprise: farmEnterprise,
      soilType: farmSoil,
      totalAcres: parseFloat(farmAcres) || activeFarm.totalAcres,
    });
    setIsEditFarmModalOpen(false);
  };

  // Handle Add Plot
  const handleAddPlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const enterpriseNotes =
        plotEnterprise === 'crops'
          ? `Crop: ${plotCrop}; variety: ${plotVariety}.`
          : `Livestock: ${plotSpecies}; breed: ${plotBreed}; head count: ${plotAnimalCount}.`;
      await addPlot({
        farmId: activeFarm.id,
        plotNumber,
        name: plotName,
        acres: parseFloat(plotAcres) || 0.5,
        currentCrop: plotEnterprise === 'crops' ? plotCrop : plotSpecies,
        variety: plotEnterprise === 'crops' ? plotVariety : plotBreed,
        soilPh: plotEnterprise === 'crops' ? parseFloat(plotSoilPh) || 6.3 : 0,
        soilCondition: 'Sandy loam amended with compost',
        irrigation: plotEnterprise === 'crops' ? plotIrrigation : 'Rainfed',
        status: 'Active Cultivation',
        notes: [
          enterpriseNotes,
          plotNotes || 'New parcel registered into farm record ledger.',
        ].join('\n'),
      });
      // Reset form
      setPlotName('');
      setPlotNotes('');
      setPlotEnterprise('crops');
      setIsAddPlotModalOpen(false);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  // Handle Edit Plot
  const handleEditPlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;
    try {
      await updatePlot(editingPlot.id, {
        name: editingPlot.name,
        currentCrop: editingPlot.currentCrop,
        variety: editingPlot.variety,
        acres: editingPlot.acres,
        irrigation: editingPlot.irrigation,
        notes: editingPlot.notes,
      });
      setEditingPlot(null);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  const totalLivestockCount = livestock.reduce((acc, curr) => acc + curr.count, 0);
  const openAddPlotModal = () => {
    setPlotNumber(`Plot ${farmPlots.length + 1}`);
    setIsAddPlotModalOpen(true);
  };

  if (farmsLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center">
        <Trees className="mx-auto h-9 w-9 animate-pulse text-emerald-700" />
        <p className="mt-3 text-sm text-slate-600">Loading your farms...</p>
      </div>
    );
  }

  if (!selectedFarm) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <Trees className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Farm not found</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          This farm may have been removed or may not belong to your account.
        </p>
        <Link
          to="/farm"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f3d21]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Farms
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <DataStateBanner collection="plots" />
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Farm Operations · {activeFarm.county}
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              <span className="capitalize">{activeFarm.primaryEnterprise} farming</span>
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Trees className="w-7 h-7 text-[#16A34A]" />
            <span>My Farm & Land Parcels</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registered parcel cadastre, boundary coordinates, soil chemistry profiles, and plot allocation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/farm"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            All Farms
          </Link>

          <Button
            variant="outline"
            size="md"
            leftIcon={<Edit3 className="w-4 h-4" />}
            onClick={() => {
              setFarmName(activeFarm.name);
              setFarmLocation(activeFarm.location);
              setFarmEnterprise(activeFarm.primaryEnterprise);
              setFarmSoil(activeFarm.soilType);
              setFarmAcres(activeFarm.totalAcres.toString());
              setIsEditFarmModalOpen(true);
            }}
          >
            Edit Farm Details
          </Button>

          <Button
            variant="forest"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAddPlotModal}
          >
            Add New Plot
          </Button>
        </div>
      </div>

      {/* Farm Overview Banner Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14532D] text-white p-6 sm:p-8 shadow-md border border-emerald-800">
        <div className="absolute inset-0 z-0">
          <img
            src={activeFarm.satelliteImage || '/src/assets/images/busia_green_valley_aerial_1794435580896.jpg'}
            alt="Farm parcel aerial view"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14532D] via-[#14532D]/95 to-[#14532D]/85" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-200 font-semibold border border-white/10">
                Registered farm · {activeFarm.id}
              </span>
              <span className="text-emerald-300">·</span>
              <span className="text-emerald-200 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#86EFAC]" />
                {activeFarm.location}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {activeFarm.name}
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              <strong>Enterprise:</strong> <span className="capitalize">{activeFarm.primaryEnterprise}</span>. <br />
              <strong>Soil Profile:</strong> {activeFarm.soilType}.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-emerald-200">
              <span>Farmer: <strong className="text-white">{farmer.fullName}</strong></span>
              <span>·</span>
              <span>National ID: <strong className="text-white">{farmer.nationalIdNumber}</strong></span>
              <span>·</span>
              <span>Sub-County: <strong className="text-white">{activeFarm.subCounty}</strong></span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Total Land</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-white">{activeFarm.totalAcres} Ac</span>
              <span className="text-[10px] text-emerald-200 block">Registered acreage</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Active Plots</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-white">{farmPlots.length}</span>
              <span className="text-[10px] text-emerald-200 block">Demarcated</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Active Crops</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-white">{crops.length}</span>
              <span className="text-[10px] text-emerald-200 block">Varieties</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Livestock</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-white">{totalLivestockCount}</span>
              <span className="text-[10px] text-emerald-200 block">Animals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Farm Plots & Field Demarcation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Farm Plots & Cultivated Sections ({farmPlots.length})
            </h3>
            <p className="text-xs text-slate-500">
              Each plot represents a GPS-mapped agricultural field with soil pH monitoring and assigned enterprise.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={openAddPlotModal}
          >
            Add Plot
          </Button>
        </div>

        {farmPlots.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-[#16A34A]" />}
            title="No Plots Demarcated Yet"
            description="Add your first plot to track crop cycles, soil pH, and irrigation methods."
            actionText="Demarcate Plot"
            onAction={openAddPlotModal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {farmPlots.map((plot) => (
              <Card
                key={plot.id}
                padding="md"
                className="bg-white border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                          {plot.plotNumber}
                        </span>
                        <h4 className="text-base font-bold text-slate-900">{plot.name}</h4>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                        Allocated: <strong className="text-slate-800 font-bold">{plot.acres} Acres</strong> · {plot.status}
                      </span>
                    </div>

                    <button
                      onClick={() => setEditingPlot(plot)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit Plot"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Attributes strip */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center my-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Crop</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {plot.currentCrop}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">({plot.variety})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Soil pH</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {plot.soilPh > 0 ? plot.soilPh : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {plot.soilPh > 0 ? 'Measured' : 'Not tested'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Watering</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {plot.irrigation}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Method</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    <strong>Agronomic Notes:</strong> {plot.notes}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    GPS Perimeter Verified
                  </span>
                  <button
                    onClick={() => setEditingPlot(plot)}
                    className="text-[#14532D] font-bold hover:underline"
                  >
                    Update Plot Details →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Mixed Farming Enterprises Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crops Balance */}
        <Card padding="md" className="bg-white border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                <Sprout className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Crop Allocation Summary</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#14532D]">{crops.length} Active Crops</span>
          </div>

          <div className="space-y-3">
            {crops.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{c.name} ({c.variety})</span>
                  <span className="text-slate-500 text-[11px]">{c.plotName} · {c.acres} Acres</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800 block">{c.projectedYield}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">{c.growthStage}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Livestock Balance */}
        <Card padding="md" className="bg-white border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#14532D] flex items-center justify-center">
                <Beef className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Livestock Holding Summary</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#14532D]">{totalLivestockCount} Total Animals</span>
          </div>

          <div className="space-y-3">
            {livestock.map((l) => (
              <div
                key={l.id}
                className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{l.category}</span>
                  <span className="text-slate-500 text-[11px]">{l.subType}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-800 block">{l.count} Head</span>
                  <span className="text-[10px] text-slate-500">{l.dailyOutput}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Edit Farm Modal */}
      <Modal
        isOpen={isEditFarmModalOpen}
        onClose={() => setIsEditFarmModalOpen(false)}
        title="Edit Farm Property Details"
        description="Update cadastral information, land acreage, and primary enterprise description."
        primaryAction={{
          label: 'Save Changes',
          onClick: () => {
            // trigger submit via form
            const btn = document.getElementById('save-farm-btn');
            btn?.click();
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsEditFarmModalOpen(false),
        }}
      >
        <form onSubmit={handleSaveFarm} className="space-y-4 text-xs">
          <Input
            label="Farm Name"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location / Sub-County"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              required
            />
            <Input
              label="Total Size (Acres)"
              type="number"
              step="0.1"
              value={farmAcres}
              onChange={(e) => setFarmAcres(e.target.value)}
              required
            />
          </div>

          <Input
            label="Primary Enterprise"
            value={farmEnterprise}
            onChange={(e) => setFarmEnterprise(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Soil & Agro-Ecological Description
            </label>
            <textarea
              rows={3}
              value={farmSoil}
              onChange={(e) => setFarmSoil(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
              required
            />
          </div>

          <button type="submit" id="save-farm-btn" className="hidden" />
        </form>
      </Modal>

      {/* Add Plot Modal */}
      <Modal
        isOpen={isAddPlotModalOpen}
        onClose={() => setIsAddPlotModalOpen(false)}
        title="Add New Field Plot"
        description="Demarcate a new farming parcel for record tracking."
        primaryAction={{
          label: 'Create Plot Record',
          onClick: () => {
            document.getElementById('add-plot-btn')?.click();
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsAddPlotModalOpen(false),
        }}
      >
        <form onSubmit={handleAddPlotSubmit} className="space-y-4 text-xs">
          <Select
            label="What will this plot be used for?"
            value={plotEnterprise}
            onChange={(e) => setPlotEnterprise(e.target.value as 'crops' | 'livestock')}
            options={[
              { value: 'crops', label: 'Crops' },
              { value: 'livestock', label: 'Livestock' },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Plot Identifier (e.g. Plot 5)"
              value={plotNumber}
              onChange={(e) => setPlotNumber(e.target.value)}
              required
            />
            <Input
              label="Plot Name / Label"
              placeholder="e.g. East Terrace Beds"
              value={plotName}
              onChange={(e) => setPlotName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Acreage"
            type="number"
            min="0.1"
            step="0.1"
            value={plotAcres}
            onChange={(e) => setPlotAcres(e.target.value)}
            required
          />

          {plotEnterprise === 'crops' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Current Crop"
                  value={plotCrop}
                  onChange={(e) => setPlotCrop(e.target.value)}
                  required
                />
                <Input
                  label="Variety"
                  value={plotVariety}
                  onChange={(e) => setPlotVariety(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Estimated Soil pH"
                  type="number"
                  min="0"
                  max="14"
                  step="0.1"
                  value={plotSoilPh}
                  onChange={(e) => setPlotSoilPh(e.target.value)}
                  required
                />
                <Select
                  label="Irrigation Method"
                  value={plotIrrigation}
                  onChange={(e) =>
                    setPlotIrrigation(
                      e.target.value as 'Rainfed' | 'Drip Irrigation' | 'Furrow / Trench',
                    )
                  }
                  options={[
                    { value: 'Rainfed', label: 'Rainfed' },
                    { value: 'Drip Irrigation', label: 'Drip Irrigation' },
                    { value: 'Furrow / Trench', label: 'Furrow / Trench' },
                  ]}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Select
                label="Livestock Species"
                value={plotSpecies}
                onChange={(e) => setPlotSpecies(e.target.value)}
                options={[
                  { value: 'Cattle', label: 'Cattle' },
                  { value: 'Goat', label: 'Goats' },
                  { value: 'Sheep', label: 'Sheep' },
                  { value: 'Poultry', label: 'Poultry' },
                  { value: 'Pig', label: 'Pigs' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Input
                label="Breed"
                placeholder="e.g. Friesian"
                value={plotBreed}
                onChange={(e) => setPlotBreed(e.target.value)}
                required
              />
              <Input
                label="Number of Animals"
                type="number"
                min="1"
                step="1"
                value={plotAnimalCount}
                onChange={(e) => setPlotAnimalCount(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {plotEnterprise === 'crops' ? 'Initial Plot Notes' : 'Livestock Housing / Plot Notes'}
            </label>
            <textarea
              rows={2}
              placeholder={
                plotEnterprise === 'crops'
                  ? 'e.g. Compost added, prepared for upcoming planting...'
                  : 'e.g. Fenced pasture with a nearby water point...'
              }
              value={plotNotes}
              onChange={(e) => setPlotNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </div>

          <button type="submit" id="add-plot-btn" className="hidden" />
        </form>
      </Modal>

      {/* Edit Plot Modal */}
      {editingPlot && (
        <Modal
          isOpen={!!editingPlot}
          onClose={() => setEditingPlot(null)}
          title={`Edit ${editingPlot.plotNumber}: ${editingPlot.name}`}
          description="Update crop assignment, variety, or management notes."
          primaryAction={{
            label: 'Save Plot Updates',
            onClick: () => {
              document.getElementById('edit-plot-btn')?.click();
            },
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setEditingPlot(null),
          }}
        >
          <form onSubmit={handleEditPlotSubmit} className="space-y-4 text-xs">
            <Input
              label="Plot Label"
              value={editingPlot.name}
              onChange={(e) => setEditingPlot({ ...editingPlot, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Current Crop"
                value={editingPlot.currentCrop}
                onChange={(e) => setEditingPlot({ ...editingPlot, currentCrop: e.target.value })}
                required
              />
              <Input
                label="Variety"
                value={editingPlot.variety}
                onChange={(e) => setEditingPlot({ ...editingPlot, variety: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Acreage"
                type="number"
                step="0.1"
                value={editingPlot.acres.toString()}
                onChange={(e) => setEditingPlot({ ...editingPlot, acres: parseFloat(e.target.value) || 0.5 })}
                required
              />
              <Select
                label="Irrigation Method"
                value={editingPlot.irrigation}
                onChange={(e) => setEditingPlot({ ...editingPlot, irrigation: e.target.value as any })}
                options={[
                  { value: 'Rainfed', label: 'Rainfed' },
                  { value: 'Drip Irrigation', label: 'Drip Irrigation' },
                  { value: 'Furrow / Trench', label: 'Furrow / Trench' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Management Notes
              </label>
              <textarea
                rows={3}
                value={editingPlot.notes}
                onChange={(e) => setEditingPlot({ ...editingPlot, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
              />
            </div>

            <button type="submit" id="edit-plot-btn" className="hidden" />
          </form>
        </Modal>
      )}
    </div>
  );
};
