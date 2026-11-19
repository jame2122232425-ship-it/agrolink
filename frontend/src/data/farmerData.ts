export interface Farm {
  id: string;
  name: string;
  location: string;
  county: string;
  subCounty: string;
  totalAcres: number;
  primaryEnterprise: string;
  soilType: string;
  satelliteImage?: string;
}

export interface FarmerProfile {
  id: string;
  fullName: string;
  preferredName: string;
  avatarInitials: string;
  profilePictureUrl?: string | null;
  phoneNumber: string;
  nationalIdNumber: string;
  county: string;
  activeFarmId: string;
  farms: Farm[];
  language: 'English' | 'Kiswahili';
  memberSince: string;
}

export interface CropRecord {
  id: string;
  name: string;
  variety: string;
  plotName: string;
  acres: number;
  plantedDate: string;
  growthStage: string;
  progressPercent: number;
  healthStatus: 'healthy' | 'attention' | 'observation';
  healthScore: number;
  expectedHarvest: string;
  projectedYield: string;
  color: string;
}

export interface LivestockRecord {
  id: string;
  category: string;
  subType: string;
  count: number;
  healthStatus: 'healthy' | 'attention' | 'observation';
  dailyOutput: string;
  upcomingActivity: {
    title: string;
    date: string;
    isUrgent?: boolean;
  };
  iconName: string;
  breed?: string;
  animals?: IndividualAnimal[];
  vaccinationHistory?: VaccineRecord[];
  feedingNotes?: string;
  lastVetCheckup?: string;
}

export interface IndividualAnimal {
  id: string;
  tagNumber: string;
  name: string;
  breed: string;
  category: 'cattle' | 'goat' | 'poultry' | 'sheep' | 'pig' | 'other';
  sex: 'Female' | 'Male' | 'Unknown';
  age: string;
  status:
    | 'lactating'
    | 'dry'
    | 'heifer'
    | 'layer'
    | 'grower'
    | 'active'
    | 'sold'
    | 'deceased'
    | 'missing'
    | 'slaughtered';
  dailyYield?: string;
  healthStatus: 'healthy' | 'attention' | 'observation';
  lastVaccination: string;
  notes: string;
  species?: string;
  productionPurpose?: string;
}

export interface VaccineRecord {
  id: string;
  date: string;
  animalGroup: string;
  vaccineName: string;
  targetDisease: string;
  administeredBy: string;
  costKes: number;
  nextBoosterDate: string;
  status: 'completed' | 'scheduled';
}

export interface FarmPlot {
  id: string;
  farmId: string;
  plotNumber: string;
  name: string;
  acres: number;
  currentCrop: string;
  variety: string;
  soilPh: number;
  soilCondition: string;
  irrigation: 'Rainfed' | 'Drip Irrigation' | 'Furrow / Trench';
  status: 'Active Cultivation' | 'Harvested' | 'Fallow / Cover Crop';
  notes: string;
}

export interface ProblemReport {
  id: string;
  ticketNumber: string;
  category: 'crop' | 'livestock' | 'pest' | 'disease' | 'soil' | 'water' | 'other';
  title: string;
  description: string;
  affectedItem: string;
  plotOrLocation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dateReported: string;
  timeAgo: string;
  imageUrl?: string;
  status:
    | 'Submitted'
    | 'Under Review'
    | 'Referred'
    | 'In Progress'
    | 'Awaiting Farmer'
    | 'Resolved'
    | 'Closed'
    | 'Rejected'
    | 'Duplicate';
  officialNotes?: string;
  expertAssigned?: string;
  backendId?: number;
  cropId?: string;
  livestockGroupId?: string;
  animalId?: string;
  backendStatus?: string;
  reportReference?: string;
}

export interface ExpertProfile {
  id: string;
  name: string;
  title: string;
  category: 'Veterinary Professional' | 'Agronomist' | 'Soil Testing Specialist' | 'Extension Consultant';
  areaServed: string;
  county: string;
  shortBio: string;
  rating: number;
  reviewsCount: number;
  demonstrationAvailability: string;
  exampleServices: Array<{ service: string; estimatedFee: string }>;
  verifiedNotice: string;
  phone: string;
  photoUrl?: string;
}

export interface ExpertServiceRequest {
  id: string;
  expertId: string;
  expertName: string;
  farmerName: string;
  serviceType: string;
  farmPlotOrUnit: string;
  preferredDate: string;
  issueDescription: string;
  status: 'Pending Review' | 'Confirmed' | 'Completed';
  submittedAt: string;
}

export interface MarketListing {
  id: string;
  type: 'buyer_contract' | 'input_supplier' | 'commodity_price';
  category: 'Maize' | 'Beans' | 'Vegetables' | 'Dairy & Eggs' | 'Fertilizer & Seeds' | 'Equipment';
  title: string;
  organization: string;
  location: string;
  priceOrRate: string;
  description: string;
  badge: string;
  minVolume?: string;
  contactPerson?: string;
  phone?: string;
  verifiedEscrow?: boolean;
  datePosted: string;
}

export interface WeatherDayForecast {
  day: string;
  date: string;
  tempHigh: number;
  tempLow: number;
  rainChance: number;
  rainAmountMm: number;
  condition: string;
  agroAdvisory: string;
  iconType: 'rain' | 'sun' | 'cloud' | 'thunder';
}

export interface WeatherForecastData {
  county: string;
  subCounty: string;
  ward: string;
  elevation: string;
  asOfTime: string;
  current: {
    temp: number;
    condition: string;
    humidityPercent: number;
    windSpeedKmh: number;
    windDirection: string;
    rainProbabilityToday: number;
    todayRainMm: number;
    uvIndex: string;
    soilMoistureStatus: string;
  };
  sevenDayForecast: WeatherDayForecast[];
  farmAlerts: string[];
  seasonalOutlook: string;
}

export interface AgriculturalAlert {
  id: string;
  type: 'report' | 'crop' | 'livestock' | 'weather' | 'reminder' | 'community';
  severity: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  description: string;
  date: string;
  timeAgo: string;
  suggestedAction: string;
  actionText?: string;
  actionRoute: string;
  isRead: boolean;
}

export interface FarmActivity {
  id: string;
  category: 'crop' | 'dairy' | 'soil' | 'report' | 'market';
  title: string;
  detail: string;
  plotOrUnit: string;
  date: string;
  timeAgo: string;
  status: 'completed' | 'in_progress' | 'scheduled';
}
