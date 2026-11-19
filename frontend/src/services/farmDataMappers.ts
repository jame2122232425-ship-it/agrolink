import {
  CropRecord,
  FarmActivity,
  FarmPlot,
  IndividualAnimal,
  LivestockRecord,
  ProblemReport,
  VaccineRecord,
} from '../data/farmerData';
import {
  ApiAnimal,
  ApiCrop,
  ApiCropHealthRecord,
  ApiFarmActivityFeed,
  ApiFarmActivityItem,
  ApiLivestockGroup,
  ApiLivestockHealthRecord,
  ApiLivestockMedicalRecord,
  ApiPlot,
  ApiReport,
} from './apiService';

const CROP_COLORS = ['#16a34a', '#0d9488', '#65a30d', '#ca8a04', '#0284c7', '#7c3aed'];

const SOIL_LABELS: Record<string, string> = {
  clay: 'Clay',
  loam: 'Loam',
  sandy: 'Sandy',
  silt: 'Silt',
  other: 'Other',
  unknown: 'Unknown',
};

const REPORT_CATEGORY_MAP: Record<string, ProblemReport['category']> = {
  crop_health: 'crop',
  livestock_health: 'livestock',
  pest_disease: 'pest',
  soil: 'soil',
  water_irrigation: 'water',
  weather_climate: 'other',
  infrastructure: 'other',
  other: 'other',
};

const REPORT_STATUS_MAP: Record<string, ProblemReport['status']> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Referred',
  in_progress: 'In Progress',
  awaiting_farmer: 'Awaiting Farmer',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
};

const REPORT_SEVERITY_MAP: Record<string, ProblemReport['severity']> = {
  low: 'low',
  moderate: 'medium',
  high: 'high',
  critical: 'critical',
};

const ACTIVITY_STATUS_MAP: Record<string, FarmActivity['status']> = {
  completed: 'completed',
  scheduled: 'scheduled',
  in_progress: 'in_progress',
};

const round = (value: number): number => Math.round(value * 100) / 100;

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

export const formatTimeAgo = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const diffMinutes = Math.round((Date.now() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }
  return `${Math.round(months / 12)}y ago`;
};

const toAcres = (value: number | string, unit = 'acres'): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (unit === 'hectares') {
    return round(numeric * 2.47105);
  }
  if (unit === 'square_metres') {
    return round(numeric / 4046.8564224);
  }
  return round(numeric);
};

const latestByDate = <T extends { observation_date: string }>(records: T[]): T | undefined =>
  [...records].sort((a, b) => b.observation_date.localeCompare(a.observation_date))[0];

const healthFromObservation = (
  observation?: { severity: string; general_condition: string },
): CropRecord['healthStatus'] => {
  if (!observation) {
    return 'healthy';
  }
  if (
    observation.general_condition === 'poor' ||
    observation.severity === 'high' ||
    observation.severity === 'critical'
  ) {
    return 'attention';
  }
  if (observation.general_condition === 'fair' || observation.severity === 'moderate') {
    return 'observation';
  }
  return 'healthy';
};

const healthScoreFor = (status: CropRecord['healthStatus']): number => {
  if (status === 'attention') {
    return 45;
  }
  if (status === 'observation') {
    return 72;
  }
  return 100;
};

const estimateCropProgress = (crop: ApiCrop): number => {
  if (crop.status === 'harvested' || crop.actual_harvest_date) {
    return 100;
  }
  if (crop.planting_date && crop.expected_harvest_date) {
    const start = new Date(crop.planting_date).getTime();
    const end = new Date(crop.expected_harvest_date).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      const ratio = (Date.now() - start) / (end - start);
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    }
  }
  const stage = (crop.growth_stage_name ?? '').toLowerCase();
  if (stage.includes('germin')) {
    return 10;
  }
  if (stage.includes('veget')) {
    return 35;
  }
  if (stage.includes('flower')) {
    return 60;
  }
  if (stage.includes('fruit')) {
    return 80;
  }
  if (stage.includes('matur') || stage.includes('harvest')) {
    return 95;
  }
  return crop.status === 'active' ? 25 : 0;
};

const animalCategory = (species: string): IndividualAnimal['category'] => {
  const value = species.toLowerCase();
  if (value.includes('cattle') || value.includes('cow') || value.includes('dairy')) {
    return 'cattle';
  }
  if (value.includes('goat')) {
    return 'goat';
  }
  if (value.includes('poultry') || value.includes('chicken') || value.includes('layer')) {
    return 'poultry';
  }
  if (value.includes('sheep')) {
    return 'sheep';
  }
  if (value.includes('pig') || value.includes('swine')) {
    return 'pig';
  }
  return 'other';
};

const animalStatus = (status: string): IndividualAnimal['status'] => {
  const allowed: IndividualAnimal['status'][] = [
    'active',
    'sold',
    'deceased',
    'missing',
    'slaughtered',
    'lactating',
    'dry',
    'heifer',
    'layer',
    'grower',
  ];
  return allowed.includes(status as IndividualAnimal['status'])
    ? (status as IndividualAnimal['status'])
    : 'active';
};

const animalAge = (animal: ApiAnimal): string => {
  if (animal.birth_date) {
    const birth = new Date(animal.birth_date);
    if (!Number.isNaN(birth.getTime())) {
      const months = Math.max(
        0,
        (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
      );
      const years = Math.floor(months / 12);
      const remainingMonths = Math.floor(months % 12);
      if (years > 0) {
        return `${years} yr ${remainingMonths} mo`;
      }
      return `${remainingMonths} mo`;
    }
  }
  if (animal.estimated_age_months) {
    const years = Math.floor(animal.estimated_age_months / 12);
    const months = animal.estimated_age_months % 12;
    return years > 0 ? `${years} yr ${months} mo` : `${months} mo`;
  }
  return 'Age not recorded';
};

const subjectLabel = (
  animal: ApiAnimal | undefined,
  group: ApiLivestockGroup | undefined,
): string => {
  if (animal) {
    return animal.name_or_tag || animal.identification_number || animal.species;
  }
  if (group) {
    return group.group_name;
  }
  return '—';
};

export const mapPlots = (plots: ApiPlot[], crops: ApiCrop[] = []): FarmPlot[] =>
  plots.map((plot, index) => {
    const plotCrops = crops.filter((crop) => crop.plot === plot.id);
    const activeCrop =
      plotCrops.find((crop) => crop.status === 'active') ?? plotCrops[0] ?? undefined;

    return {
      id: String(plot.id),
      farmId: String(plot.farm),
      plotNumber: `Plot ${index + 1}`,
      name: plot.name,
      acres: toAcres(plot.size),
      currentCrop: activeCrop?.crop_name ?? 'Fallow',
      variety: activeCrop?.variety ?? '',
      soilPh: plot.soil_ph === null || plot.soil_ph === undefined ? 0 : Number(plot.soil_ph),
      soilCondition:
        SOIL_LABELS[plot.soil_type] ?? (capitalize(plot.soil_type) || 'Unknown'),
      irrigation: plot.irrigation_enabled ? 'Drip Irrigation' : 'Rainfed',
      status: activeCrop ? 'Active Cultivation' : 'Fallow / Cover Crop',
      notes: plot.description,
    };
  });

export const mapCrops = (
  crops: ApiCrop[],
  healthRecords: ApiCropHealthRecord[] = [],
): CropRecord[] =>
  crops.map((crop, index) => {
    const observation = latestByDate(
      healthRecords.filter((record) => record.crop === crop.id),
    );
    const healthStatus = healthFromObservation(observation);

    return {
      id: String(crop.id),
      name: crop.crop_name,
      variety: crop.variety || 'Local variety',
      plotName: crop.plot_name ?? 'Unassigned plot',
      acres: toAcres(crop.area_planted, crop.area_unit),
      plantedDate: formatDisplayDate(crop.planting_date),
      growthStage: crop.growth_stage_name ?? capitalize(crop.status),
      progressPercent: estimateCropProgress(crop),
      healthStatus,
      healthScore: healthScoreFor(healthStatus),
      expectedHarvest: formatDisplayDate(crop.expected_harvest_date),
      projectedYield: '—',
      color: CROP_COLORS[index % CROP_COLORS.length],
    };
  });

export const mapAnimals = (
  animals: ApiAnimal[],
  medicalRecords: ApiLivestockMedicalRecord[] = [],
  healthRecords: ApiLivestockHealthRecord[] = [],
): IndividualAnimal[] =>
  animals.map((animal) => {
    const observation = latestByDate(
      healthRecords.filter((record) => record.animal === animal.id),
    );
    const lastMedical = [...medicalRecords]
      .filter((record) => record.animal === animal.id)
      .sort((a, b) => b.administration_date.localeCompare(a.administration_date))[0];

    return {
      id: String(animal.id),
      tagNumber: animal.identification_number || `AN-${animal.id}`,
      name: animal.name_or_tag || animal.identification_number || animal.species,
      breed: animal.breed || 'Mixed breed',
      category: animalCategory(animal.species),
      sex:
        animal.sex === 'female' ? 'Female' : animal.sex === 'male' ? 'Male' : 'Unknown',
      age: animalAge(animal),
      status: animalStatus(animal.status),
      dailyYield: undefined,
      healthStatus: healthFromObservation(observation),
      lastVaccination: lastMedical
        ? `${lastMedical.product_or_vaccine} (${formatDisplayDate(lastMedical.administration_date)})`
        : 'None recorded',
      notes: animal.notes,
      species: animal.species,
      productionPurpose: animal.production_purpose,
    };
  });

export const mapVaccinations = (
  records: ApiLivestockMedicalRecord[],
  animals: ApiAnimal[] = [],
  groups: ApiLivestockGroup[] = [],
): VaccineRecord[] => {
  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const today = new Date().toISOString().slice(0, 10);

  return records.map((record) => ({
    id: String(record.id),
    date: formatDisplayDate(record.administration_date),
    animalGroup: subjectLabel(
      record.animal ? animalsById.get(record.animal) : undefined,
      record.group ? groupsById.get(record.group) : undefined,
    ),
    vaccineName: record.product_or_vaccine,
    targetDisease: '—',
    administeredBy: record.administered_by || 'Farmer reported',
    costKes: 0,
    nextBoosterDate: formatDisplayDate(record.next_scheduled_date),
    status:
      record.next_scheduled_date && record.next_scheduled_date > today
        ? 'scheduled'
        : 'completed',
  }));
};

export const mapLivestockGroups = (
  groups: ApiLivestockGroup[],
  animals: IndividualAnimal[] = [],
  vaccinations: VaccineRecord[] = [],
): LivestockRecord[] =>
  groups.map((group) => {
    const trackedAnimals = animals.filter((animal) =>
      animal.species
        ? animal.species.toLowerCase() === group.species.toLowerCase()
        : animal.category === animalCategory(group.species),
    );
    const count = Math.max(group.animal_count, trackedAnimals.length);
    const attention = trackedAnimals.some((animal) => animal.healthStatus === 'attention');
    const observation = trackedAnimals.some(
      (animal) => animal.healthStatus === 'observation',
    );

    return {
      id: String(group.id),
      category: capitalize(group.species),
      subType: group.breed || group.production_purpose || 'Mixed',
      count,
      healthStatus: attention ? 'attention' : observation ? 'observation' : 'healthy',
      dailyOutput: '0',
      upcomingActivity: {
        title: 'No upcoming activity recorded',
        date: '—',
        isUrgent: false,
      },
      iconName:
        group.species.toLowerCase().includes('cattle')
          ? 'milk'
          : group.species.toLowerCase().includes('poultry')
            ? 'egg'
            : 'beef',
      breed: group.breed || undefined,
      animals: trackedAnimals,
      vaccinationHistory: vaccinations,
      feedingNotes: group.notes || undefined,
      lastVetCheckup: undefined,
    };
  });

export const mapReports = (reports: ApiReport[]): ProblemReport[] =>
  reports.map((report) => ({
    id: String(report.id),
    ticketNumber: report.report_reference,
    category: REPORT_CATEGORY_MAP[report.category] ?? 'other',
    title: report.title,
    description: report.description,
    affectedItem: report.title,
    plotOrLocation: report.location_details || '—',
    severity: REPORT_SEVERITY_MAP[report.severity] ?? 'medium',
    dateReported: formatDisplayDate(report.submitted_at),
    timeAgo: formatTimeAgo(report.submitted_at),
    status: REPORT_STATUS_MAP[report.status] ?? 'Submitted',
    officialNotes: report.resolution_summary || undefined,
    backendId: report.id,
    cropId: report.crop ? String(report.crop) : undefined,
    livestockGroupId: report.livestock_group ? String(report.livestock_group) : undefined,
    animalId: report.animal ? String(report.animal) : undefined,
    backendStatus: report.status,
    reportReference: report.report_reference,
  }));

const activityCategory = (item: ApiFarmActivityItem): FarmActivity['category'] => {
  const allowed: FarmActivity['category'][] = ['crop', 'dairy', 'soil', 'report', 'market'];
  return allowed.includes(item.category as FarmActivity['category'])
    ? (item.category as FarmActivity['category'])
    : 'crop';
};

export const mapActivities = (feed: ApiFarmActivityFeed): FarmActivity[] =>
  feed.results.map((item) => ({
    id: item.id,
    category: activityCategory(item),
    title: item.title,
    detail: item.detail,
    plotOrUnit: item.location || item.subject,
    date: formatDisplayDate(item.date),
    timeAgo: formatTimeAgo(item.date),
    status: ACTIVITY_STATUS_MAP[item.status] ?? 'completed',
  }));

export const toBackendReportCategory = (category: ProblemReport['category']): string => {
  const reverse: Record<ProblemReport['category'], string> = {
    crop: 'crop_health',
    livestock: 'livestock_health',
    pest: 'pest_disease',
    disease: 'pest_disease',
    soil: 'soil',
    water: 'water_irrigation',
    other: 'other',
  };
  return reverse[category] ?? 'other';
};

export const toBackendReportSeverity = (severity: ProblemReport['severity']): string => {
  if (severity === 'medium') {
    return 'moderate';
  }
  return severity;
};

export const toDateInputValue = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().slice(0, 10);
};
