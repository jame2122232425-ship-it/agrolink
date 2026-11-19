import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FarmerProfile,
  Farm,
  AgriculturalAlert,
  CropRecord,
  LivestockRecord,
  IndividualAnimal,
  VaccineRecord,
  FarmPlot,
  ProblemReport,
  FarmActivity,
} from '../data/farmerData';
import {
  apiService,
  ApiAnimal,
  ApiCrop,
  ApiCropGrowthStage,
  ApiCropHealthRecord,
  ApiFarmActivityFeed,
  ApiLivestockGroup,
  ApiLivestockHealthRecord,
  ApiLivestockMedicalRecord,
  ApiNotification,
  ApiPlot,
  ApiReport,
  NewFarmDetails,
} from '../services/apiService';
import {
  formatDisplayDate,
  formatTimeAgo,
  mapActivities,
  mapAnimals,
  mapCrops,
  mapLivestockGroups,
  mapPlots,
  mapReports,
  mapVaccinations,
  toBackendReportCategory,
  toBackendReportSeverity,
  toDateInputValue,
} from '../services/farmDataMappers';

type FarmRegistration = Omit<Farm, 'id' | 'soilType' | 'satelliteImage' | 'primaryEnterprise'> & {
  primaryEnterprise: NewFarmDetails['farming_type'];
};

export type FarmerCollection =
  | 'plots'
  | 'crops'
  | 'livestock'
  | 'animals'
  | 'vaccinations'
  | 'reports'
  | 'activities'
  | 'alerts';

export interface CollectionState {
  loading: boolean;
  error: string | null;
}

const EMPTY_FARMER: FarmerProfile = {
  id: '',
  fullName: '',
  preferredName: '',
  avatarInitials: '',
  phoneNumber: '',
  nationalIdNumber: '',
  county: '',
  activeFarmId: '',
  farms: [],
  language: 'English',
  memberSince: '',
};

const EMPTY_FARM: Farm = {
  id: '',
  name: '',
  location: '',
  county: '',
  subCounty: '',
  totalAcres: 0,
  primaryEnterprise: '',
  soilType: '',
};

const COLLECTIONS: FarmerCollection[] = [
  'plots',
  'crops',
  'livestock',
  'animals',
  'vaccinations',
  'reports',
  'activities',
  'alerts',
];

const COLLECTION_LABELS: Record<FarmerCollection, string> = {
  plots: 'farm plots',
  crops: 'crops',
  livestock: 'livestock',
  animals: 'animals',
  vaccinations: 'vaccination records',
  reports: 'reports',
  activities: 'activity ledger',
  alerts: 'alerts',
};

const emptyStatus = (): Record<FarmerCollection, CollectionState> => {
  const status = {} as Record<FarmerCollection, CollectionState>;
  COLLECTIONS.forEach((key) => {
    status[key] = { loading: false, error: null };
  });
  return status;
};

const ACTIVE_FARM_KEY = 'agrolink_active_farm';

interface ToastNotice {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface FarmerContextType {
  farmer: FarmerProfile;
  activeFarm: Farm;
  farms: Farm[];
  totalFarmAcres: number;
  farmsLoading: boolean;
  plotCount: number | null;
  herdCount: number | null;
  dataLoading: boolean;
  dataStatus: Record<FarmerCollection, CollectionState>;
  reloadFarmData: () => Promise<void>;
  retry: (collection: FarmerCollection) => Promise<void>;
  switchFarm: (farmId: string) => void;
  addFarm: (farm: FarmRegistration) => Promise<Farm>;
  updateActiveFarm: (updates: Partial<Farm>) => void;
  updateProfile: (updates: Partial<FarmerProfile>) => void;
  uploadProfilePicture: (file: File) => Promise<void>;

  // Plots
  plots: FarmPlot[];
  addPlot: (plot: Omit<FarmPlot, 'id'>) => Promise<FarmPlot>;
  updatePlot: (plotId: string, updates: Partial<FarmPlot>) => Promise<FarmPlot>;

  // Crops
  crops: CropRecord[];
  addCrop: (crop: Omit<CropRecord, 'id'>) => Promise<CropRecord>;
  updateCrop: (cropId: string, updates: Partial<CropRecord>) => Promise<CropRecord>;
  deleteCrop: (cropId: string) => Promise<boolean>;

  // Livestock & Animals
  livestock: LivestockRecord[];
  animals: IndividualAnimal[];
  vaccinations: VaccineRecord[];
  addAnimal: (animal: Omit<IndividualAnimal, 'id'>) => Promise<IndividualAnimal>;
  updateAnimal: (animalId: string, updates: Partial<IndividualAnimal>) => Promise<IndividualAnimal>;
  addVaccination: (record: Omit<VaccineRecord, 'id'>) => Promise<VaccineRecord>;

  // Problem Reports
  reports: ProblemReport[];
  submitReport: (
    report: Omit<ProblemReport, 'id' | 'ticketNumber' | 'dateReported' | 'timeAgo' | 'status'>,
    evidence?: File | null,
  ) => Promise<ProblemReport>;

  // Alerts
  alerts: AgriculturalAlert[];
  unreadAlertsCount: number;
  refreshAlerts: () => Promise<void>;
  markAlertAsRead: (alertId: string) => Promise<void>;
  markAllAlertsAsRead: () => Promise<void>;

  // Activities
  activities: FarmActivity[];
  addActivity: (act: Omit<FarmActivity, 'id' | 'date' | 'timeAgo'>) => Promise<void>;

  // Global UI & Language
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  language: 'English' | 'Kiswahili';
  toggleLanguage: () => void;

  // Toast System
  toast: ToastNotice | null;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: () => void;
}

const FarmerContext = createContext<FarmerContextType | undefined>(undefined);

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const parseDisplayDate = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const iso = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) {
    return iso[0];
  }
  const year = trimmed.match(/(\d{4})/)?.[1];
  const normalised = trimmed.replace(/[–—]/g, '-');
  const monthDay = normalised.match(/^([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (monthDay && year) {
    const parsed = new Date(`${monthDay[1]} ${monthDay[2]}, ${year}`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return undefined;
};

const ageToMonths = (age: string): number | null => {
  if (!age) {
    return null;
  }
  const years = age.match(/(\d+)\s*(?:yr|year)/i);
  const months = age.match(/(\d+)\s*(?:mo|month)/i);
  if (years || months) {
    return (years ? Number(years[1]) * 12 : 0) + (months ? Number(months[1]) : 0);
  }
  const plain = age.match(/(\d+)/);
  return plain ? Number(plain[1]) * 12 : null;
};

const BACKEND_ANIMAL_STATUSES = ['active', 'sold', 'deceased', 'missing', 'slaughtered'];

const toBackendSpecies = (category: string): string => {
  const map: Record<string, string> = {
    cattle: 'Cattle',
    goat: 'Goat',
    sheep: 'Sheep',
    pig: 'Pig',
    poultry: 'Poultry',
    other: 'Other',
  };
  return map[category.toLowerCase()] ?? (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Other');
};

const toBackendSex = (sex: string): 'female' | 'male' | 'unknown' => {
  const value = sex.toLowerCase();
  if (value === 'female') return 'female';
  if (value === 'male') return 'male';
  return 'unknown';
};

const toBackendAnimalStatus = (status: string): string =>
  BACKEND_ANIMAL_STATUSES.includes(status) ? status : 'active';

const toBackendSoilType = (condition: string): string => {
  const value = condition.toLowerCase();
  if (value.includes('sand')) return 'sandy';
  if (value.includes('clay')) return 'clay';
  if (value.includes('silt')) return 'silt';
  if (value.includes('loam')) return 'loam';
  if (value.includes('other')) return 'other';
  return 'unknown';
};

const normaliseStage = (value: string): string =>
  value.toLowerCase().replace(/growth|stage|phase/g, '').replace(/[^a-z]/g, '');

const matchGrowthStage = (
  stages: ApiCropGrowthStage[],
  name?: string,
): number | null => {
  if (!name) {
    return null;
  }
  const target = normaliseStage(name);
  if (!target) {
    return null;
  }
  const exact = stages.find((stage) => normaliseStage(stage.name) === target);
  if (exact) {
    return exact.id;
  }
  const partial = stages.find(
    (stage) =>
      normaliseStage(stage.name).includes(target) ||
      target.includes(normaliseStage(stage.name)),
  );
  return partial ? partial.id : null;
};

const matchReportSeverity = (severity: ProblemReport['severity']): string =>
  toBackendReportSeverity(severity);

const toAlertSeverity = (severity: string): AgriculturalAlert['severity'] => {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'moderate' || severity === 'medium') return 'warning';
  if (severity === 'low') return 'info';
  return 'warning';
};

const isOpenReport = (status: string): boolean =>
  ['submitted', 'under_review', 'assigned', 'in_progress', 'awaiting_farmer'].includes(status);

interface AlertSource {
  reports: ApiReport[];
  crops: ApiCrop[];
  cropHealth: ApiCropHealthRecord[];
  animals: ApiAnimal[];
  groups: ApiLivestockGroup[];
  livestockHealth: ApiLivestockHealthRecord[];
  medical: ApiLivestockMedicalRecord[];
}

const buildAlerts = (source: AlertSource, previous: AgriculturalAlert[]): AgriculturalAlert[] => {
  const readIds = new Set(previous.filter((alert) => alert.isRead).map((alert) => alert.id));
  const cropsById = new Map(source.crops.map((crop) => [crop.id, crop]));
  const animalsById = new Map(source.animals.map((animal) => [animal.id, animal]));
  const groupsById = new Map(source.groups.map((group) => [group.id, group]));
  const alerts: AgriculturalAlert[] = [];

  const push = (alert: AgriculturalAlert) => {
    alerts.push({ ...alert, isRead: readIds.has(alert.id) });
  };

  source.reports
    .filter((report) => isOpenReport(report.status))
    .forEach((report) => {
      push({
        id: `report-${report.id}`,
        type: report.category.includes('livestock') ? 'livestock' : 'crop',
        severity: toAlertSeverity(report.severity),
        title: report.title,
        description: report.description,
        date: formatDisplayDate(report.submitted_at),
        timeAgo: formatTimeAgo(report.submitted_at),
        suggestedAction: 'Review the report status and respond to extension officer notes.',
        actionText: 'Open reports',
        actionRoute: '/report-problem',
        isRead: false,
      });
    });

  source.cropHealth
    .filter((record) => record.severity === 'high' || record.severity === 'critical' || record.general_condition === 'poor')
    .forEach((record) => {
      const crop = cropsById.get(record.crop);
      if (!crop) return;
      push({
        id: `crop-health-${record.id}`,
        type: 'crop',
        severity: record.severity === 'critical' ? 'danger' : 'warning',
        title: `${crop.crop_name} health observation`,
        description:
          record.symptoms_observed || 'A crop health observation needs your attention.',
        date: formatDisplayDate(record.observation_date),
        timeAgo: formatTimeAgo(record.observation_date),
        suggestedAction: 'Inspect the affected plants and log a treatment activity.',
        actionText: 'Open crops',
        actionRoute: '/crops',
        isRead: false,
      });
    });

  source.livestockHealth
    .filter((record) => record.severity === 'high' || record.severity === 'critical' || record.general_condition === 'poor')
    .forEach((record) => {
      const animal = record.animal ? animalsById.get(record.animal) : undefined;
      const group = record.group ? groupsById.get(record.group) : undefined;
      const subject = animal?.name_or_tag || animal?.identification_number || group?.group_name;
      if (!subject) return;
      push({
        id: `livestock-health-${record.id}`,
        type: 'livestock',
        severity: record.severity === 'critical' ? 'danger' : 'warning',
        title: `${subject} health observation`,
        description:
          record.symptoms_reported || 'A livestock health observation needs your attention.',
        date: formatDisplayDate(record.observation_date),
        timeAgo: formatTimeAgo(record.observation_date),
        suggestedAction: 'Arrange a veterinary checkup and record the treatment.',
        actionText: 'Open livestock',
        actionRoute: '/livestock',
        isRead: false,
      });
    });

  const today = new Date();
  const horizon = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  source.medical
    .filter((record) => record.next_scheduled_date)
    .forEach((record) => {
      const due = new Date(record.next_scheduled_date as string);
      if (Number.isNaN(due.getTime()) || due > horizon) {
        return;
      }
      const animal = record.animal ? animalsById.get(record.animal) : undefined;
      const group = record.group ? groupsById.get(record.group) : undefined;
      const subject = animal?.name_or_tag || group?.group_name || 'Herd';
      const overdue = due < today;
      push({
        id: `vaccination-${record.id}`,
        type: 'reminder',
        severity: overdue ? 'danger' : 'warning',
        title: overdue ? `Overdue: ${record.product_or_vaccine}` : `Due soon: ${record.product_or_vaccine}`,
        description: `${subject} · scheduled for ${formatDisplayDate(record.next_scheduled_date)}.`,
        date: formatDisplayDate(record.next_scheduled_date),
        timeAgo: formatTimeAgo(record.next_scheduled_date),
        suggestedAction: overdue
          ? 'Book the vaccination or treatment with your veterinarian.'
          : 'Confirm the appointment and prepare the animal.',
        actionText: 'Open livestock',
        actionRoute: '/livestock',
        isRead: false,
      });
    });

  return alerts;
};

const mapNotification = (notification: ApiNotification): AgriculturalAlert => {
  const actionText: Record<ApiNotification['notification_type'], string> = {
    report: 'Open reports',
    crop: 'Open crops',
    livestock: 'Open livestock',
    reminder: 'Open livestock',
    community: 'Open community',
  };
  return {
    id: String(notification.id),
    type: notification.notification_type,
    severity: notification.severity,
    title: notification.title,
    description: notification.message,
    date: formatDisplayDate(notification.created_at),
    timeAgo: formatTimeAgo(notification.created_at),
    suggestedAction: 'Review the notification and follow up on the related farm record.',
    actionText: actionText[notification.notification_type],
    actionRoute: notification.action_url || '/activity',
    isRead: notification.is_read,
  };
};

const settleValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

const settleError = (result: PromiseSettledResult<unknown>): string | null =>
  result.status === 'rejected'
    ? toErrorMessage(result.reason, 'Could not load records.')
    : null;

export const FarmerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [farmer, setFarmer] = useState<FarmerProfile>(EMPTY_FARMER);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(true);
  const [plotCount, setPlotCount] = useState<number | null>(null);
  const [herdCount, setHerdCount] = useState<number | null>(null);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [crops, setCrops] = useState<CropRecord[]>([]);
  const [livestock, setLivestock] = useState<LivestockRecord[]>([]);
  const [animals, setAnimals] = useState<IndividualAnimal[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccineRecord[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [alerts, setAlerts] = useState<AgriculturalAlert[]>([]);
  const [dataStatus, setDataStatus] = useState<Record<FarmerCollection, CollectionState>>(
    emptyStatus,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [growthStages, setGrowthStages] = useState<ApiCropGrowthStage[]>([]);
  const loadRequestRef = useRef(0);
  const activeFarmIdRef = useRef('');

  const activeFarm = farms.find((f) => f.id === farmer.activeFarmId) || farms[0] || EMPTY_FARM;
  const totalFarmAcres = farms.reduce((total, farm) => total + farm.totalAcres, 0);
  activeFarmIdRef.current = activeFarm.id;

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
      setToast({ id: `toast-${Date.now()}`, message, type });
      setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr));
      }, 4000);
    },
    [],
  );

  const dismissToast = () => setToast(null);

  const setCollectionState = (
    key: FarmerCollection,
    next: CollectionState,
  ) => {
    setDataStatus((prev) => ({ ...prev, [key]: next }));
  };

  const loadFarmData = useCallback(
    async (farmId: string) => {
      if (!farmId || !apiService.getAccessToken()) {
        return;
      }
      const requestId = ++loadRequestRef.current;
      setDataStatus({
        ...emptyStatus(),
        plots: { loading: true, error: null },
        crops: { loading: true, error: null },
        livestock: { loading: true, error: null },
        animals: { loading: true, error: null },
        vaccinations: { loading: true, error: null },
        reports: { loading: true, error: null },
        activities: { loading: true, error: null },
        alerts: { loading: true, error: null },
      });

      const [
        plotsResult,
        cropsResult,
        groupsResult,
        animalsResult,
        medicalResult,
        livestockHealthResult,
        cropHealthResult,
        reportsResult,
        feedResult,
        stagesResult,
        notificationsResult,
      ] = await Promise.allSettled([
        apiService.getPlots(farmId),
        apiService.getCrops(farmId),
        apiService.getLivestockGroups(farmId),
        apiService.getAnimals(farmId),
        apiService.getLivestockMedicalRecords(farmId),
        apiService.getLivestockHealthRecords(farmId),
        apiService.getCropHealthRecords(farmId),
        apiService.getReports(),
        apiService.getFarmActivityFeed(farmId, 200),
        apiService.getCropGrowthStages(),
        apiService.getNotifications(),
      ]);

      if (requestId !== loadRequestRef.current) {
        return;
      }

      const rawPlots: ApiPlot[] = settleValue(plotsResult, []);
      const rawCrops: ApiCrop[] = settleValue(cropsResult, []);
      const rawGroups: ApiLivestockGroup[] = settleValue(groupsResult, []);
      const rawAnimals: ApiAnimal[] = settleValue(animalsResult, []);
      const rawMedical: ApiLivestockMedicalRecord[] = settleValue(medicalResult, []);
      const rawLivestockHealth: ApiLivestockHealthRecord[] = settleValue(
        livestockHealthResult,
        [],
      );
      const rawCropHealth: ApiCropHealthRecord[] = settleValue(cropHealthResult, []);
      const rawReports: ApiReport[] = settleValue(reportsResult, []);
      const feed: ApiFarmActivityFeed | null =
        feedResult.status === 'fulfilled' ? feedResult.value : null;
      const stages: ApiCropGrowthStage[] = settleValue(stagesResult, []);
      const loadedNotifications = settleValue(notificationsResult, null);

      const farmReports = rawReports.filter((report) => String(report.farm) === String(farmId));
      const mappedCrops = mapCrops(rawCrops, rawCropHealth);
      const mappedAnimals = mapAnimals(rawAnimals, rawMedical, rawLivestockHealth);
      const mappedVaccinations = mapVaccinations(rawMedical, rawAnimals, rawGroups);

      setPlots(mapPlots(rawPlots, rawCrops));
      setCrops(mappedCrops);
      setLivestock(mapLivestockGroups(rawGroups, mappedAnimals, mappedVaccinations));
      setAnimals(mappedAnimals);
      setVaccinations(mappedVaccinations);
      setReports(mapReports(farmReports));
      setActivities(feed ? mapActivities(feed) : []);
      setPlotCount(rawPlots.length);
      setHerdCount(rawGroups.length);
      setGrowthStages(stages);
      if (loadedNotifications) {
        setAlerts(loadedNotifications.map(mapNotification));
      } else {
        setAlerts((previous) =>
          buildAlerts(
            {
              reports: farmReports,
              crops: rawCrops,
              cropHealth: rawCropHealth,
              animals: rawAnimals,
              groups: rawGroups,
              livestockHealth: rawLivestockHealth,
              medical: rawMedical,
            },
            previous,
          ),
        );
      }

      const results: Record<FarmerCollection, PromiseSettledResult<unknown>> = {
        plots: plotsResult,
        crops: cropsResult,
        livestock: groupsResult,
        animals: animalsResult,
        vaccinations: medicalResult,
        reports: reportsResult,
        activities: feedResult,
        alerts: notificationsResult,
      };
      const nextStatus = {} as Record<FarmerCollection, CollectionState>;
      COLLECTIONS.forEach((key) => {
        const result = results[key];
        nextStatus[key] = {
          loading: false,
          error: result ? settleError(result) : null,
        };
      });
      setDataStatus(nextStatus);
    },
    [],
  );

  const refreshAlerts = useCallback(async () => {
    if (!apiService.getAccessToken()) {
      return;
    }

    setDataStatus((previous) => ({
      ...previous,
      alerts: { loading: true, error: null },
    }));
    try {
      const notifications = await apiService.getNotifications();
      setAlerts(notifications.map(mapNotification));
      setDataStatus((previous) => ({
        ...previous,
        alerts: { loading: false, error: null },
      }));
    } catch (error) {
      const message = toErrorMessage(error, 'Could not load notifications.');
      setDataStatus((previous) => ({
        ...previous,
        alerts: { loading: false, error: message },
      }));
      showToast(message, 'warning');
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;

    const hydrateProfile = async () => {
      if (!apiService.getAccessToken()) {
        setFarmsLoading(false);
        return;
      }

      setFarmsLoading(true);
      setPlotCount(null);
      setHerdCount(null);

      try {
        const [backendProfile, backendFarms] = await Promise.all([
          apiService.getFarmerProfile(),
          apiService.getFarms(),
        ]);

        if (!isMounted) return;

        const savedFarm =
          typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_FARM_KEY) : null;
        const preferredFarm =
          backendFarms.find((farm) => farm.id === savedFarm) ??
          backendFarms.find((farm) => farm.id === backendProfile.activeFarmId) ??
          backendFarms[0];

        setFarmer({
          ...backendProfile,
          farms: backendFarms,
          activeFarmId: preferredFarm?.id ?? '',
        });
        setFarms(backendFarms);

        if (preferredFarm) {
          await loadFarmData(preferredFarm.id);
        }
      } catch (error) {
        if (!isMounted) return;
        showToast(toErrorMessage(error, 'Could not load your account.'), 'error');
      } finally {
        if (isMounted) setFarmsLoading(false);
      }
    };

    hydrateProfile();
    window.addEventListener('agrolink-authenticated', hydrateProfile);

    return () => {
      isMounted = false;
      window.removeEventListener('agrolink-authenticated', hydrateProfile);
    };
  }, [loadFarmData, showToast]);

  const reloadFarmData = useCallback(async () => {
    const farmId = activeFarmIdRef.current;
    if (farmId) {
      await loadFarmData(farmId);
    }
  }, [loadFarmData]);

  const retry = useCallback(
    async (_collection: FarmerCollection) => {
      await reloadFarmData();
    },
    [reloadFarmData],
  );

  const switchFarm = (farmId: string) => {
    setFarmer((prev) => ({
      ...prev,
      activeFarmId: farmId,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_FARM_KEY, farmId);
    }
    const target = farms.find((f) => f.id === farmId);
    showToast(`Switched active workspace to ${target ? target.name : 'Farm'}`, 'info');
  };

  const addFarm = async (farm: FarmRegistration) => {
    const newFarm = await apiService.createFarm({
      name: farm.name,
      location: farm.location,
      county: farm.county,
      sub_county: farm.subCounty,
      size: farm.totalAcres,
      farming_type: farm.primaryEnterprise,
    });
    setFarms((prev) => [...prev, newFarm]);
    setFarmer((prev) => ({
      ...prev,
      farms: [...prev.farms, newFarm],
      activeFarmId: newFarm.id,
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_FARM_KEY, newFarm.id);
    }
    showToast(`Farm "${newFarm.name}" registered successfully.`);
    return newFarm;
  };

  const updateActiveFarm = (updates: Partial<Farm>) => {
    const farmId = activeFarm.id;
    if (!farmId) {
      return;
    }
    const optimistic = farms.map((farm) =>
      farm.id === farmId ? { ...farm, ...updates } : farm,
    );
    setFarms(optimistic);
    setFarmer((prev) => ({
      ...prev,
      farms: prev.farms.map((farm) =>
        farm.id === farmId ? { ...farm, ...updates } : farm,
      ),
    }));
    showToast('Farm parcel details updated successfully.');

    void apiService
      .updateFarm(farmId, {
        name: updates.name,
        location: updates.location,
        farming_type: updates.primaryEnterprise,
        size: updates.totalAcres,
      })
      .catch((error) => {
        showToast(toErrorMessage(error, 'Could not save the farm details.'), 'error');
      });
  };

  const updateProfile = (updates: Partial<FarmerProfile>) => {
    setFarmer((prev) => ({ ...prev, ...updates }));
    showToast('Profile updated.');
    void apiService
      .updateFarmerProfile({
        county: updates.county,
        contact_phone: updates.phoneNumber,
        preferred_language:
          updates.language === undefined
            ? undefined
            : updates.language === 'Kiswahili'
              ? 'sw'
              : 'en',
      })
      .catch((error) => {
        showToast(toErrorMessage(error, 'Could not save the profile.'), 'error');
      });
  };

  const uploadProfilePicture = async (file: File) => {
    const updatedProfile = await apiService.uploadFarmerProfilePicture(file);
    setFarmer((prev) => ({
      ...prev,
      profilePictureUrl: updatedProfile.profilePictureUrl,
    }));
    showToast('Profile picture updated.');
  };

  const resolvePlot = (value?: string): FarmPlot | undefined => {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    return plots.find(
      (plot) =>
        plot.name === trimmed ||
        plot.plotNumber === trimmed ||
        `${plot.plotNumber} (${plot.name})` === trimmed ||
        `${plot.plotNumber}: ${plot.name}` === trimmed ||
        trimmed.includes(plot.name),
    );
  };

  const addPlot = async (plotData: Omit<FarmPlot, 'id'>) => {
    const created = await apiService.createPlot(plotData.farmId || activeFarm.id, {
      name: plotData.name,
      size: plotData.acres,
      soil_type: toBackendSoilType(plotData.soilCondition),
      soil_ph: plotData.soilPh > 0 ? plotData.soilPh : null,
      irrigation_enabled: plotData.irrigation !== 'Rainfed',
      description: plotData.notes,
    });
    await reloadFarmData();
    showToast(`Plot "${created.name}" added to your farm records.`);
    const mapped = mapPlots([created], [])[0];
    return { ...mapped, ...plotData, id: String(created.id) };
  };

  const updatePlot = async (plotId: string, updates: Partial<FarmPlot>) => {
    const existing = plots.find((plot) => plot.id === plotId);
    const farmId = existing?.farmId || activeFarm.id;
    const created = await apiService.updatePlot(farmId, plotId, {
      name: updates.name,
      size: updates.acres,
      soil_ph: updates.soilPh !== undefined && updates.soilPh > 0 ? updates.soilPh : null,
      soil_type: updates.soilCondition
        ? toBackendSoilType(updates.soilCondition)
        : undefined,
      irrigation_enabled:
        updates.irrigation === undefined ? undefined : updates.irrigation !== 'Rainfed',
      description: updates.notes,
    });
    await reloadFarmData();
    showToast(`Plot "${created.name}" updated.`);
    return mapPlots([created], [])[0];
  };

  const addCrop = async (cropData: Omit<CropRecord, 'id'>) => {
    const plot = resolvePlot(cropData.plotName);
    const created = await apiService.createCrop({
      farm: Number(activeFarm.id),
      plot: plot ? Number(plot.id) : null,
      crop_name: cropData.name,
      variety: cropData.variety,
      planting_date: parseDisplayDate(cropData.plantedDate) ?? null,
      expected_harvest_date: parseDisplayDate(cropData.expectedHarvest) ?? null,
      area_planted: cropData.acres,
      area_unit: 'acres',
      growth_stage: matchGrowthStage(growthStages, cropData.growthStage),
      status: 'active',
      notes: cropData.projectedYield ? `Projected yield: ${cropData.projectedYield}` : '',
    });
    if (cropData.healthStatus !== 'healthy') {
      await apiService
        .createCropHealthRecord({
          crop: created.id,
          severity: cropData.healthStatus === 'attention' ? 'high' : 'moderate',
          general_condition: cropData.healthStatus === 'attention' ? 'poor' : 'fair',
          symptoms_observed:
            cropData.healthStatus === 'attention'
              ? 'Flagged for attention when the crop was registered.'
              : 'Recorded under observation when the crop was registered.',
        })
        .catch(() => undefined);
    }
    await reloadFarmData();
    showToast(`Added ${created.crop_name} (${created.variety}) to ${cropData.plotName}.`);
    return (
      crops.find((crop) => crop.id === String(created.id)) ?? {
        ...cropData,
        id: String(created.id),
      }
    );
  };

  const updateCrop = async (cropId: string, updates: Partial<CropRecord>) => {
    const plot = updates.plotName ? resolvePlot(updates.plotName) : undefined;
    await apiService.updateCrop(cropId, {
      plot: updates.plotName === undefined ? undefined : plot ? Number(plot.id) : null,
      crop_name: updates.name,
      variety: updates.variety,
      area_planted: updates.acres,
      growth_stage:
        updates.growthStage === undefined
          ? undefined
          : matchGrowthStage(growthStages, updates.growthStage),
      expected_harvest_date:
        updates.expectedHarvest === undefined
          ? undefined
          : parseDisplayDate(updates.expectedHarvest) ?? null,
      notes:
        updates.projectedYield === undefined
          ? undefined
          : `Projected yield: ${updates.projectedYield}`,
    });
    await reloadFarmData();
    showToast(`Updated ${updates.name ?? 'crop'} records.`);
    return crops.find((crop) => crop.id === cropId) ?? { ...updates, id: cropId } as CropRecord;
  };

  const deleteCrop = async (cropId: string) => {
    await apiService.deleteCrop(cropId);
    await reloadFarmData();
    showToast('Crop cycle record archived.');
    return true;
  };

  const addAnimal = async (animalData: Omit<IndividualAnimal, 'id'>) => {
    const created = await apiService.createAnimal({
      farm: Number(activeFarm.id),
      species: toBackendSpecies(animalData.category),
      breed: animalData.breed,
      name_or_tag: animalData.name,
      identification_number: animalData.tagNumber,
      sex: toBackendSex(animalData.sex),
      estimated_age_months: ageToMonths(animalData.age),
      production_purpose: animalData.productionPurpose,
      status: toBackendAnimalStatus(animalData.status),
      notes: [animalData.notes, animalData.dailyYield ? `Daily yield: ${animalData.dailyYield}` : '']
        .filter(Boolean)
        .join(' '),
    });
    if (animalData.healthStatus !== 'healthy') {
      await apiService
        .createLivestockHealthRecord({
          animal: created.id,
          severity: animalData.healthStatus === 'attention' ? 'high' : 'moderate',
          general_condition: animalData.healthStatus === 'attention' ? 'poor' : 'fair',
          symptoms_reported:
            animalData.healthStatus === 'attention'
              ? 'Flagged for attention when the animal was registered.'
              : 'Recorded under observation when the animal was registered.',
        })
        .catch(() => undefined);
    }
    await reloadFarmData();
    showToast(`Animal ${created.name_or_tag || created.identification_number} registered.`);
    return (
      animals.find((animal) => animal.id === String(created.id)) ?? {
        ...animalData,
        id: String(created.id),
      }
    );
  };

  const updateAnimal = async (animalId: string, updates: Partial<IndividualAnimal>) => {
    await apiService.updateAnimal(animalId, {
      name_or_tag: updates.name,
      breed: updates.breed,
      status: updates.status ? toBackendAnimalStatus(updates.status) : undefined,
      notes: updates.notes,
      production_purpose: updates.productionPurpose,
    });
    await reloadFarmData();
    showToast(`Updated record for ${updates.name ?? 'animal'}.`);
    return animals.find((animal) => animal.id === animalId) ?? { ...updates, id: animalId } as IndividualAnimal;
  };

  const addVaccination = async (vaxData: Omit<VaccineRecord, 'id'>) => {
    const group =
      livestock.find(
        (record) =>
          record.category.toLowerCase().includes(vaxData.animalGroup.toLowerCase()) ||
          vaxData.animalGroup.toLowerCase().includes(record.category.toLowerCase()),
      ) ?? livestock[0];
    const animal = animals[0];
    if (!group && !animal) {
      throw new Error('Register a livestock group or animal before logging a vaccination.');
    }
    const created = await apiService.createLivestockMedicalRecord({
      group: group ? Number(group.id) : null,
      animal: group ? null : animal ? Number(animal.id) : null,
      record_type: 'vaccination',
      product_or_vaccine: vaxData.vaccineName,
      administration_date: parseDisplayDate(vaxData.date) ?? undefined,
      next_scheduled_date: parseDisplayDate(vaxData.nextBoosterDate) ?? null,
      administered_by: vaxData.administeredBy,
      notes: vaxData.targetDisease ? `Target disease: ${vaxData.targetDisease}` : '',
    });
    await reloadFarmData();
    showToast(`Logged vaccination: ${created.product_or_vaccine}.`);
    return (
      vaccinations.find((record) => record.id === String(created.id)) ?? {
        ...vaxData,
        id: String(created.id),
      }
    );
  };

  const submitReport = async (
    reportData: Omit<ProblemReport, 'id' | 'ticketNumber' | 'dateReported' | 'timeAgo' | 'status'>,
    evidence?: File | null,
  ) => {
    const plot = resolvePlot(reportData.plotOrLocation);
    const crop = crops.find(
      (item) =>
        item.name.toLowerCase() === reportData.affectedItem.toLowerCase() ||
        item.plotName === reportData.plotOrLocation,
    );
    const created = await apiService.createReport({
      farm: Number(activeFarm.id),
      plot: plot ? Number(plot.id) : null,
      crop: reportData.cropId
        ? Number(reportData.cropId)
        : crop &&
            ['crop', 'pest', 'disease'].includes(reportData.category)
          ? Number(crop.id)
          : null,
      livestock_group: reportData.livestockGroupId
        ? Number(reportData.livestockGroupId)
        : null,
      animal: reportData.animalId ? Number(reportData.animalId) : null,
      title: reportData.title,
      description: reportData.description,
      category: toBackendReportCategory(reportData.category),
      severity: matchReportSeverity(reportData.severity),
      location_details: reportData.plotOrLocation,
    });
    if (evidence) {
      await apiService.uploadReportEvidence(created.id, evidence).catch(() => undefined);
    }
    await reloadFarmData();
    const mapped =
      reports.find((report) => report.id === String(created.id)) ?? {
        ...reportData,
        id: String(created.id),
        ticketNumber: created.report_reference,
        dateReported: formatDisplayDate(created.submitted_at),
        timeAgo: formatTimeAgo(created.submitted_at),
        status: 'Submitted' as const,
        backendId: created.id,
        backendStatus: created.status,
        reportReference: created.report_reference,
      };
    showToast(`Ticket #${created.report_reference} submitted for agronomic triage.`);
    return mapped;
  };

  const markAlertAsRead = async (alertId: string) => {
    const alert = alerts.find((item) => item.id === alertId);
    if (!alert || alert.isRead) {
      return;
    }

    if (/^\d+$/.test(alert.id)) {
      try {
        await apiService.markNotificationRead(alert.id);
      } catch (error) {
        showToast(toErrorMessage(error, 'Could not mark notification as read.'), 'warning');
        return;
      }
    }
    setAlerts((prev) =>
      prev.map((item) => (item.id === alertId ? { ...item, isRead: true } : item)),
    );
  };

  const markAllAlertsAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setAlerts((prev) => prev.map((item) => ({ ...item, isRead: true })));
      showToast('All notifications marked as read.');
    } catch (error) {
      showToast(toErrorMessage(error, 'Could not mark notifications as read.'), 'warning');
    }
  };

  const addActivity = async (act: Omit<FarmActivity, 'id' | 'date' | 'timeAgo'>) => {
    if (!activeFarm.id) {
      throw new Error('Register a farm before logging farm notes.');
    }
    await apiService.createFarmNote(activeFarm.id, {
      title: act.title,
      detail: act.detail,
      category: act.category,
      note_date: toDateInputValue(new Date().toISOString()) || undefined,
    });
    await reloadFarmData();
  };

  const toggleLanguage = () => {
    const newLang = farmer.language === 'English' ? 'Kiswahili' : 'English';
    setFarmer((prev) => ({ ...prev, language: newLang }));
    showToast(`Lugha imebadilishwa / Language set to ${newLang}.`, 'info');
    void apiService
      .updateFarmerProfile({ preferred_language: newLang === 'Kiswahili' ? 'sw' : 'en' })
      .catch(() => undefined);
  };

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length;
  const dataLoading = COLLECTIONS.some((key) => dataStatus[key].loading);

  return (
    <FarmerContext.Provider
      value={{
        farmer,
        activeFarm,
        farms,
        totalFarmAcres,
        farmsLoading,
        plotCount,
        herdCount,
        dataLoading,
        dataStatus,
        reloadFarmData,
        retry,
        switchFarm,
        addFarm,
        updateActiveFarm,
        updateProfile,
        uploadProfilePicture,

        plots,
        addPlot,
        updatePlot,

        crops,
        addCrop,
        updateCrop,
        deleteCrop,

        livestock,
        animals,
        vaccinations,
        addAnimal,
        updateAnimal,
        addVaccination,

        reports,
        submitReport,

        alerts,
        unreadAlertsCount,
        refreshAlerts,
        markAlertAsRead,
        markAllAlertsAsRead,

        activities,
        addActivity,

        searchQuery,
        setSearchQuery,
        language: farmer.language,
        toggleLanguage,

        toast,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
};

export const useFarmer = (): FarmerContextType => {
  const context = useContext(FarmerContext);
  if (!context) {
    throw new Error('useFarmer must be used within a FarmerProvider');
  }
  return context;
};
