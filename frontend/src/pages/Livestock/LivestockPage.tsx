import React, { useState } from 'react';
import {
  Beef,
  Plus,
  Milk,
  HeartPulse,
  Calendar,
  ShieldCheck,
  Egg,
  Activity,
  AlertCircle,
  Eye,
  Edit3,
  Syringe,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
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
import { IndividualAnimal, VaccineRecord } from '../../data/farmerData';

export const LivestockPage: React.FC = () => {
  const { activeFarm, livestock, animals, vaccinations, addAnimal, updateAnimal, addVaccination } = useFarmer();

  // Selected Category filter: all, cattle, goat, poultry
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cattle' | 'goat' | 'poultry'>('all');
  const [activeTab, setActiveTab] = useState<'animals' | 'vaccines' | 'husbandry'>('animals');

  // Modals state
  const [isAddAnimalModalOpen, setIsAddAnimalModalOpen] = useState(false);
  const [isAddVaxModalOpen, setIsAddVaxModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<IndividualAnimal | null>(null);
  const [viewingAnimal, setViewingAnimal] = useState<IndividualAnimal | null>(null);

  // Add Animal Form State
  const [tagNumber, setTagNumber] = useState(`KE-BS-0${animals.length + 1}`);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'cattle' | 'goat' | 'poultry'>('cattle');
  const [breed, setBreed] = useState('Friesian-Jersey Cross');
  const [sex, setSex] = useState<'Female' | 'Male'>('Female');
  const [age, setAge] = useState('3 Years');
  const [status, setStatus] = useState<'lactating' | 'dry' | 'heifer' | 'layer' | 'grower'>('lactating');
  const [dailyYield, setDailyYield] = useState('14.0 Liters / day');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'attention' | 'observation'>('healthy');
  const [notes, setNotes] = useState('Healthy animal, routine feed ration.');

  // Add Vaccine Form State
  const [vaxAnimalGroup, setVaxAnimalGroup] = useState('3 Dairy Cattle');
  const [vaccineName, setVaccineName] = useState('FOTIVAX Quadrivalent (FMD)');
  const [targetDisease, setTargetDisease] = useState('Foot and Mouth Disease');
  const [administeredBy, setAdministeredBy] = useState('Dr. Evans Wafula (Sub-County Vet)');
  const [costKes, setCostKes] = useState('1200');
  const [nextBoosterDate, setNextBoosterDate] = useState('May 2027');

  // Filtered Animals
  const filteredAnimals = animals.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const totalLivestockCount = livestock.reduce((total, group) => total + group.count, 0);
  const totalDailyMilk = livestock
    .reduce((total, group) => total + (Number.parseFloat(group.dailyOutput) || 0), 0)
    .toFixed(1);
  const nextVaccination =
    vaccinations.find((record) => record.status === 'scheduled') ??
    vaccinations.find((record) => Boolean(record.nextBoosterDate)) ??
    null;

  const cattleCount = animals.filter((animal) => animal.category === 'cattle').length;
  const goatCount = animals.filter((animal) => animal.category === 'goat').length;
  const poultryCount = animals.filter((animal) => animal.category === 'poultry').length;

  // Handle Add Animal
  const handleAddAnimalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAnimal({
        tagNumber,
        name: name || tagNumber,
        breed,
        category,
        sex,
        age,
        status,
        dailyYield: dailyYield || 'N/A',
        healthStatus,
        lastVaccination: 'Recorded Today',
        notes,
      });
      setName('');
      setIsAddAnimalModalOpen(false);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  // Handle Edit Animal
  const handleEditAnimalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal) return;
    try {
      await updateAnimal(editingAnimal.id, {
        name: editingAnimal.name,
        breed: editingAnimal.breed,
        status: editingAnimal.status,
        dailyYield: editingAnimal.dailyYield,
        healthStatus: editingAnimal.healthStatus,
        notes: editingAnimal.notes,
      });
      setEditingAnimal(null);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  // Handle Add Vaccination
  const handleAddVaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addVaccination({
        date: new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
        animalGroup: vaxAnimalGroup,
        vaccineName,
        targetDisease,
        administeredBy,
        costKes: parseInt(costKes, 10) || 0,
        nextBoosterDate,
        status: 'completed',
      });
      setIsAddVaxModalOpen(false);
    } catch {
      // The context surfaces the failure as a toast; keep the form open for retry.
    }
  };

  if (!activeFarm.id) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <Beef className="mx-auto h-10 w-10 text-slate-400" />
        <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">No farm registered</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Livestock records will be available after a farm is registered to this account.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      <DataStateBanner collection="livestock" />
      <DataStateBanner collection="animals" label="animal records" />
      <DataStateBanner collection="vaccinations" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Livestock & Herd Health{activeFarm.county ? ` · ${activeFarm.county} County` : ''}
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Smallholder Dairy & Poultry
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Beef className="w-7 h-7 text-[#14532D]" />
            <span>Livestock</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track animals, milk, and health records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Syringe className="w-4 h-4 text-[#16A34A]" />}
            onClick={() => setIsAddVaxModalOpen(true)}
          >
            Log Vaccination
          </Button>

          <Button
            variant="forest"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddAnimalModalOpen(true)}
          >
            Register Animal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm" className="bg-white border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Livestock
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalLivestockCount}</span>
            <span className="text-xs text-slate-500 font-medium">Head</span>
          </div>
          <span className="text-[11px] text-slate-500">{livestock.length} recorded groups</span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Daily Milk Production
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-[#14532D]">{totalDailyMilk}</span>
            <span className="text-xs text-slate-500 font-medium">Liters/day</span>
          </div>
          <span className="text-[11px] text-slate-500">From registered group records</span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Poultry Layer Output
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-amber-700">—</span>
            <span className="text-xs text-slate-500 font-medium">Eggs/day</span>
          </div>
          <span className="text-[11px] text-slate-500">No egg production data</span>
        </Card>

        <Card padding="sm" className="bg-white border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Upcoming Vaccination
          </span>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {nextVaccination ? nextVaccination.date : '—'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 truncate block">
            {nextVaccination
              ? `${nextVaccination.vaccineName} · ${nextVaccination.animalGroup}`
              : 'No vaccination scheduled'}
          </span>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('animals')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'animals'
              ? 'bg-[#14532D] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Beef className="w-4 h-4" />
          <span>Individual Animals Roster ({animals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vaccines')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'vaccines'
              ? 'bg-[#14532D] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Syringe className="w-4 h-4" />
          <span>Vaccination & Medical History ({vaccinations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('husbandry')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'husbandry'
              ? 'bg-[#14532D] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Husbandry & Feeding Guidelines</span>
        </button>
      </div>

      {/* Tab Content 1: Animals Roster */}
      {activeTab === 'animals' && (
        <div className="space-y-4">
          {/* Sub-Filter by category */}
          <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Filter Category:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: `All Livestock (${animals.length})` },
                { id: 'cattle', label: `Dairy Cattle (${cattleCount})` },
                { id: 'goat', label: `Dairy Goats (${goatCount})` },
                { id: 'poultry', label: `Poultry (${poultryCount})` },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-[#14532D] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredAnimals.length === 0 && (
              <div className="md:col-span-2 lg:col-span-3">
                <EmptyState
                  icon={<Beef className="w-8 h-8 text-[#16A34A]" />}
                  title="No animals registered yet"
                  description="Register individual animals to track yields, health observations, and vaccination history."
                  actionText="Register Animal"
                  onAction={() => setIsAddAnimalModalOpen(true)}
                />
              </div>
            )}
            {filteredAnimals.map((animal) => {
              const isAttention = animal.healthStatus === 'attention';

              return (
                <Card
                  key={animal.id}
                  padding="md"
                  className="bg-white border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[#14532D] bg-emerald-50 px-2 py-0.5 rounded">
                            #{animal.tagNumber}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{animal.name}</h3>
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5 block">{animal.breed}</span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isAttention
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAttention ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}
                        />
                        {isAttention ? 'Attention' : 'Optimal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-center my-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Age</span>
                        <span className="font-semibold text-slate-800">{animal.age}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                        <span className="font-semibold text-slate-800 capitalize">{animal.status}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Daily Milk</span>
                        <span className="font-bold text-[#14532D] font-mono">{animal.dailyYield || '—'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      <strong>Observation:</strong> {animal.notes}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Vaccine: {animal.lastVaccination}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewingAnimal(animal)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setEditingAnimal(animal)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Edit Record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 2: Vaccines & Medical */}
      {activeTab === 'vaccines' && (
        <Card padding="md" className="bg-white border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Vaccination & Treatment History</h3>
              <p className="text-xs text-slate-500">
                Official veterinary vaccination schedule and certified animal health ledger.
              </p>
            </div>
            <Button
              variant="forest"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddVaxModalOpen(true)}
            >
              Log New Treatment
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Animal Group</th>
                  <th className="py-3 px-3">Vaccine Name</th>
                  <th className="py-3 px-3">Target Disease</th>
                  <th className="py-3 px-3">Administered By</th>
                  <th className="py-3 px-3 text-right">Cost (KES)</th>
                  <th className="py-3 px-3">Next Booster</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {vaccinations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 px-3 text-center text-slate-500">
                      No vaccination or treatment records logged yet.
                    </td>
                  </tr>
                )}
                {vaccinations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-medium text-slate-500">{v.date}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{v.animalGroup}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-800">{v.vaccineName}</td>
                    <td className="py-3 px-3">{v.targetDisease}</td>
                    <td className="py-3 px-3 text-slate-600">{v.administeredBy}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {v.costKes.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{v.nextBoosterDate}</td>
                    <td className="py-3 px-3">
                      {v.status === 'scheduled' ? (
                        <Badge variant="warning" size="sm">
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Completed
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab Content 3: Husbandry & Feeding Guidelines */}
      {activeTab === 'husbandry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card padding="md" className="bg-white border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-[#14532D]">
              <Beef className="w-5 h-5 text-[#16A34A]" />
              <h3 className="font-bold text-sm">Dairy Cattle Husbandry</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Feed 70% chopped silage + 30% Rhodes grass hay. Provide 1 kg dairy meal per 2 liters produced above 10 liters.
              Always offer clean fresh drinking water ad-libitum (cows require 60–80 liters daily in Samia temperatures).
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Milking Hygiene:</span>
              <span className="text-slate-600 block">Pre-dip teats with iodine, strip into cup to check mastitis, dry with clean towel.</span>
            </div>
          </Card>

          <Card padding="md" className="bg-white border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-[#14532D]">
              <Activity className="w-5 h-5 text-[#16A34A]" />
              <h3 className="font-bold text-sm">Dairy Goat Husbandry</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toggenburg and Alpine cross goats require elevated wooden slatted housing with dry floor slats to prevent foot rot.
              Browse fodder: Calliandra, Leucaena, and sweet potato vines provide natural high protein.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Parasite Schedule:</span>
              <span className="text-slate-600 block">Quarterly deworming and weekly acaricide spray for tick control.</span>
            </div>
          </Card>

          <Card padding="md" className="bg-white border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-[#14532D]">
              <Egg className="w-5 h-5 text-[#F59E0B]" />
              <h3 className="font-bold text-sm">Poultry Flock Husbandry</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kuroiler dual-purpose flock requires dry wood shavings litter (5cm depth). Supplement commercial layers mash with
              crushed limestone or oyster shells for thick eggshell formation.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-800 block">Biosecurity Warning:</span>
              <span className="text-slate-600 block">Strict footbath disinfection at entrance to keep Newcastle disease out.</span>
            </div>
          </Card>
        </div>
      )}

      {/* Professional Diagnosis Standard Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block text-slate-900">Veterinary Regulatory Boundary:</strong>
          <p className="leading-relaxed text-slate-600">
            Recorded health observations, milk yield drops, and behavioral symptoms represent farmer records. Under the Kenya Veterinary Surgeons and
            Veterinary Para-Professionals Act, clinical diagnoses and prescription antibiotic administration must be conducted by licensed veterinary professionals.
          </p>
        </div>
      </div>

      {/* Modal 1: Register Animal */}
      <Modal
        isOpen={isAddAnimalModalOpen}
        onClose={() => setIsAddAnimalModalOpen(false)}
        title="Register Individual Animal"
        description="Add a new tagged animal to your farm herd registry."
        primaryAction={{
          label: 'Register Animal',
          onClick: () => document.getElementById('add-animal-submit')?.click(),
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsAddAnimalModalOpen(false),
        }}
      >
        <form onSubmit={handleAddAnimalSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ear Tag Number"
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              required
            />
            <Input
              label="Animal Name"
              placeholder="e.g. Akinyi, Baraka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              options={[
                { value: 'cattle', label: 'Dairy Cattle' },
                { value: 'goat', label: 'Dairy Goat' },
                { value: 'poultry', label: 'Poultry Flock' },
              ]}
            />
            <Input
              label="Breed"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as any)}
              options={[
                { value: 'Female', label: 'Female' },
                { value: 'Male', label: 'Male' },
              ]}
            />
            <Input
              label="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
            <Select
              label="Lactation / Stage"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'lactating', label: 'Lactating' },
                { value: 'dry', label: 'Dry Off' },
                { value: 'heifer', label: 'In-Calf Heifer' },
                { value: 'layer', label: 'Active Layer' },
                { value: 'grower', label: 'Grower' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Daily Output Yield"
              placeholder="e.g. 14.5 Liters / day"
              value={dailyYield}
              onChange={(e) => setDailyYield(e.target.value)}
            />
            <Select
              label="Health Condition"
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value as any)}
              options={[
                { value: 'healthy', label: 'Healthy (Optimal)' },
                { value: 'observation', label: 'Under Observation' },
                { value: 'attention', label: 'Needs Veterinary Attention' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Husbandry & Feed Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </div>

          <button type="submit" id="add-animal-submit" className="hidden" />
        </form>
      </Modal>

      {/* Modal 2: Edit Animal */}
      {editingAnimal && (
        <Modal
          isOpen={!!editingAnimal}
          onClose={() => setEditingAnimal(null)}
          title={`Edit ${editingAnimal.name} (#${editingAnimal.tagNumber})`}
          description="Update yield production, status, and animal observations."
          primaryAction={{
            label: 'Save Changes',
            onClick: () => document.getElementById('edit-animal-submit')?.click(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setEditingAnimal(null),
          }}
        >
          <form onSubmit={handleEditAnimalSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Animal Name"
                value={editingAnimal.name}
                onChange={(e) => setEditingAnimal({ ...editingAnimal, name: e.target.value })}
                required
              />
              <Input
                label="Breed"
                value={editingAnimal.breed}
                onChange={(e) => setEditingAnimal({ ...editingAnimal, breed: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Daily Milk / Yield"
                value={editingAnimal.dailyYield || ''}
                onChange={(e) => setEditingAnimal({ ...editingAnimal, dailyYield: e.target.value })}
              />
              <Select
                label="Health Status"
                value={editingAnimal.healthStatus}
                onChange={(e) => setEditingAnimal({ ...editingAnimal, healthStatus: e.target.value as any })}
                options={[
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'observation', label: 'Under Observation' },
                  { value: 'attention', label: 'Needs Attention' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observations
              </label>
              <textarea
                rows={3}
                value={editingAnimal.notes}
                onChange={(e) => setEditingAnimal({ ...editingAnimal, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
              />
            </div>

            <button type="submit" id="edit-animal-submit" className="hidden" />
          </form>
        </Modal>
      )}

      {/* Modal 3: View Animal Details */}
      {viewingAnimal && (
        <Modal
          isOpen={!!viewingAnimal}
          onClose={() => setViewingAnimal(null)}
          title={`${viewingAnimal.name} (#${viewingAnimal.tagNumber}) Dossier`}
          description={`Registered ${viewingAnimal.category.toUpperCase()} · ${viewingAnimal.breed}`}
          primaryAction={{
            label: 'Close',
            onClick: () => setViewingAnimal(null),
          }}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Ear Tag</span>
                <span className="font-bold text-slate-900 font-mono">#{viewingAnimal.tagNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Breed</span>
                <span className="font-bold text-slate-900">{viewingAnimal.breed}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Daily Milk Yield</span>
                <span className="font-bold text-[#14532D] font-mono">{viewingAnimal.dailyYield || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vaccination Status</span>
                <span className="font-bold text-slate-900">{viewingAnimal.lastVaccination}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Observation History</h4>
              <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                {viewingAnimal.notes}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 4: Log Vaccination */}
      <Modal
        isOpen={isAddVaxModalOpen}
        onClose={() => setIsAddVaxModalOpen(false)}
        title="Log Veterinary Vaccination / Treatment"
        description="Record official vaccine vial administration and schedule booster dates."
        primaryAction={{
          label: 'Save Vaccination Log',
          onClick: () => document.getElementById('add-vax-submit')?.click(),
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsAddVaxModalOpen(false),
        }}
      >
        <form onSubmit={handleAddVaxSubmit} className="space-y-4 text-xs">
          <Input
            label="Target Animal / Herd Group"
            value={vaxAnimalGroup}
            onChange={(e) => setVaxAnimalGroup(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vaccine Commercial Name"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              required
            />
            <Input
              label="Target Pathogen / Disease"
              value={targetDisease}
              onChange={(e) => setTargetDisease(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Administered By (Vet / Farmer)"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              required
            />
            <Input
              label="Cost (KES)"
              type="number"
              value={costKes}
              onChange={(e) => setCostKes(e.target.value)}
              required
            />
          </div>

          <Input
            label="Next Booster Due Date"
            value={nextBoosterDate}
            onChange={(e) => setNextBoosterDate(e.target.value)}
            required
          />

          <button type="submit" id="add-vax-submit" className="hidden" />
        </form>
      </Modal>
    </div>
  );
};
