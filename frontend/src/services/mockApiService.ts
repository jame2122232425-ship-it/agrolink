/**
 * AgroLink Centralized Mock API Service Layer
 * 
 * This service encapsulates all client data operations and simulates REST API calls
 * to the upcoming Django REST Framework backend.
 * 
 * Endpoints represented:
 * - GET/PUT  /api/v1/farmer/profile/
 * - GET/POST /api/v1/farms/
 * - GET/POST/PUT/DELETE /api/v1/crops/
 * - GET/POST/PUT/DELETE /api/v1/livestock/
 * - GET/POST /api/v1/problem-reports/
 * - GET      /api/v1/weather/
 * - GET/POST /api/v1/marketplace/
 * - GET/POST /api/v1/experts/
 * - GET/POST /api/v1/activity-ledger/
 * - POST     /api/v1/ai-assistant/chat/
 */

import {
  FarmerProfile,
  Farm,
  CropRecord,
  LivestockRecord,
  IndividualAnimal,
  VaccineRecord,
  FarmPlot,
  ProblemReport,
  ExpertProfile,
  ExpertServiceRequest,
  MarketListing,
  WeatherForecastData,
  FarmActivity,
  AgriculturalAlert,
} from '../data/farmerData';

// Temporary in-memory adapter; starts empty and does not seed demo farmer records.
class AgroLinkMockStore {
  farmer: FarmerProfile = {
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
  farms: Farm[] = [];
  plots: FarmPlot[] = [];
  crops: CropRecord[] = [];
  livestock: LivestockRecord[] = [];
  animals: IndividualAnimal[] = [];
  vaccines: VaccineRecord[] = [];
  problemReports: ProblemReport[] = [];
  experts: ExpertProfile[] = [];
  expertRequests: ExpertServiceRequest[] = [];
  marketListings: MarketListing[] = [];
  weather: WeatherForecastData = {
    county: '',
    subCounty: '',
    ward: '',
    elevation: '',
    asOfTime: '',
    current: {
      temp: 0,
      condition: '',
      humidityPercent: 0,
      windSpeedKmh: 0,
      windDirection: '',
      rainProbabilityToday: 0,
      todayRainMm: 0,
      uvIndex: '',
      soilMoistureStatus: '',
    },
    sevenDayForecast: [],
    farmAlerts: [],
    seasonalOutlook: '',
  };
  activities: FarmActivity[] = [];
  alerts: AgriculturalAlert[] = [];
}

const store = new AgroLinkMockStore();

// Artificial micro-latency to simulate realistic async behavior
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiService = {
  // --- 1. Farmer Profile & Farm Management ---
  async getFarmerProfile(): Promise<FarmerProfile> {
    await delay();
    return { ...store.farmer };
  },

  async updateFarmerProfile(updates: Partial<FarmerProfile>): Promise<FarmerProfile> {
    await delay();
    store.farmer = { ...store.farmer, ...updates };
    return { ...store.farmer };
  },

  async getFarms(): Promise<Farm[]> {
    await delay();
    return [...store.farms];
  },

  async updateFarm(farmId: string, updates: Partial<Farm>): Promise<Farm> {
    await delay();
    const idx = store.farms.findIndex((f) => f.id === farmId);
    if (idx === -1) throw new Error('Farm not found');
    store.farms[idx] = { ...store.farms[idx], ...updates };
    
    // Also update in farmer.farms
    store.farmer.farms = store.farmer.farms.map((f) =>
      f.id === farmId ? { ...f, ...updates } : f
    );
    return { ...store.farms[idx] };
  },

  async getPlots(farmId?: string): Promise<FarmPlot[]> {
    await delay();
    if (!farmId) return [...store.plots];
    return store.plots.filter((p) => p.farmId === farmId);
  },

  async addPlot(plotData: Omit<FarmPlot, 'id'>): Promise<FarmPlot> {
    await delay();
    const newPlot: FarmPlot = {
      ...plotData,
      id: `plot-${Date.now()}`,
    };
    store.plots.push(newPlot);
    
    // Log activity
    this.addActivity({
      category: 'crop',
      title: `Registered New Plot: ${newPlot.name}`,
      detail: `Allocated ${newPlot.acres} acres for ${newPlot.currentCrop} (${newPlot.variety}) in ${newPlot.plotNumber}.`,
      plotOrUnit: newPlot.plotNumber,
      status: 'completed',
    });

    return newPlot;
  },

  async updatePlot(plotId: string, updates: Partial<FarmPlot>): Promise<FarmPlot> {
    await delay();
    const idx = store.plots.findIndex((p) => p.id === plotId);
    if (idx === -1) throw new Error('Plot not found');
    store.plots[idx] = { ...store.plots[idx], ...updates };
    return { ...store.plots[idx] };
  },

  // --- 2. Crop Management ---
  async getCrops(): Promise<CropRecord[]> {
    await delay();
    return [...store.crops];
  },

  async addCrop(cropData: Omit<CropRecord, 'id'>): Promise<CropRecord> {
    await delay();
    const newCrop: CropRecord = {
      ...cropData,
      id: `crop-${Date.now()}`,
    };
    store.crops.push(newCrop);

    // Log to ledger
    this.addActivity({
      category: 'crop',
      title: `Planted New Crop Cycle: ${newCrop.name}`,
      detail: `Planted ${newCrop.variety} on ${newCrop.plotName} (${newCrop.acres} Acres). Expected harvest: ${newCrop.expectedHarvest}.`,
      plotOrUnit: newCrop.plotName,
      status: 'completed',
    });

    return newCrop;
  },

  async updateCrop(cropId: string, updates: Partial<CropRecord>): Promise<CropRecord> {
    await delay();
    const idx = store.crops.findIndex((c) => c.id === cropId);
    if (idx === -1) throw new Error('Crop not found');
    store.crops[idx] = { ...store.crops[idx], ...updates };

    // Log update
    if (updates.growthStage || updates.healthStatus) {
      this.addActivity({
        category: 'crop',
        title: `Updated ${store.crops[idx].name} Record`,
        detail: `Growth stage updated to "${store.crops[idx].growthStage}". Health condition: ${store.crops[idx].healthStatus}.`,
        plotOrUnit: store.crops[idx].plotName,
        status: 'completed',
      });
    }

    return { ...store.crops[idx] };
  },

  async deleteCrop(cropId: string): Promise<boolean> {
    await delay();
    const crop = store.crops.find((c) => c.id === cropId);
    store.crops = store.crops.filter((c) => c.id !== cropId);
    if (crop) {
      this.addActivity({
        category: 'crop',
        title: `Archived Crop: ${crop.name}`,
        detail: `Archived crop record from ${crop.plotName}.`,
        plotOrUnit: crop.plotName,
        status: 'completed',
      });
    }
    return true;
  },

  // --- 3. Livestock Management ---
  async getLivestock(): Promise<LivestockRecord[]> {
    await delay();
    return [...store.livestock];
  },

  async getIndividualAnimals(category?: string): Promise<IndividualAnimal[]> {
    await delay();
    if (!category || category === 'all') return [...store.animals];
    return store.animals.filter((a) => a.category === category);
  },

  async addIndividualAnimal(animalData: Omit<IndividualAnimal, 'id'>): Promise<IndividualAnimal> {
    await delay();
    const newAnimal: IndividualAnimal = {
      ...animalData,
      id: `animal-${Date.now()}`,
    };
    store.animals.push(newAnimal);

    // Update count in parent group
    const parentGroup = store.livestock.find(
      (l) => l.category.toLowerCase().includes(animalData.category)
    );
    if (parentGroup) {
      parentGroup.count += 1;
    }

    this.addActivity({
      category: 'dairy',
      title: `Registered Animal: ${newAnimal.name} (${newAnimal.tagNumber})`,
      detail: `${newAnimal.breed} added to herd roster. Health status: ${newAnimal.healthStatus}.`,
      plotOrUnit: `Tag #${newAnimal.tagNumber}`,
      status: 'completed',
    });

    return newAnimal;
  },

  async updateIndividualAnimal(animalId: string, updates: Partial<IndividualAnimal>): Promise<IndividualAnimal> {
    await delay();
    const idx = store.animals.findIndex((a) => a.id === animalId);
    if (idx === -1) throw new Error('Animal not found');
    store.animals[idx] = { ...store.animals[idx], ...updates };
    return { ...store.animals[idx] };
  },

  async getVaccinationHistory(): Promise<VaccineRecord[]> {
    await delay();
    return [...store.vaccines];
  },

  async addVaccineRecord(record: Omit<VaccineRecord, 'id'>): Promise<VaccineRecord> {
    await delay();
    const newRec: VaccineRecord = {
      ...record,
      id: `vax-${Date.now()}`,
    };
    store.vaccines.unshift(newRec);

    this.addActivity({
      category: 'dairy',
      title: `Vaccine Logged: ${newRec.vaccineName}`,
      detail: `Administered to ${newRec.animalGroup}. Target disease: ${newRec.targetDisease}.`,
      plotOrUnit: 'Veterinary Ledger',
      status: 'completed',
    });

    return newRec;
  },

  // --- 4. Problem Reports ---
  async getProblemReports(): Promise<ProblemReport[]> {
    await delay();
    return [...store.problemReports];
  },

  async submitProblemReport(
    reportData: Omit<ProblemReport, 'id' | 'ticketNumber' | 'dateReported' | 'timeAgo' | 'status'>
  ): Promise<ProblemReport> {
    await delay();
    const randomTicket = Math.floor(1000 + Math.random() * 9000);
    const newReport: ProblemReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      ticketNumber: `AGRO-BS-${randomTicket}`,
      dateReported: new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
      timeAgo: 'Just now',
      status: 'Submitted',
      officialNotes: 'Demonstration report: Saved locally in demo session. When the Django REST API is connected, reports will be securely dispatched to sub-county agricultural extension officers.',
    };

    store.problemReports.unshift(newReport);

    // Also log in activities
    this.addActivity({
      category: 'report',
      title: `Submitted Problem Ticket #${newReport.ticketNumber}`,
      detail: `${newReport.title} for ${newReport.affectedItem}. Severity: ${newReport.severity.toUpperCase()}.`,
      plotOrUnit: newReport.plotOrLocation,
      status: 'in_progress',
    });

    return newReport;
  },

  // --- 5. Weather Advisory ---
  async getWeatherAdvisory(): Promise<WeatherForecastData> {
    await delay();
    return { ...store.weather };
  },

  // --- 6. Marketplace & Buyer Opportunities ---
  async getMarketListings(): Promise<MarketListing[]> {
    await delay();
    return [...store.marketListings];
  },

  async expressInterestInListing(
    listingId: string,
    interestData: { volumePledged: string; farmerNotes: string }
  ): Promise<{ success: boolean; message: string }> {
    await delay();
    const listing = store.marketListings.find((m) => m.id === listingId);
    
    this.addActivity({
      category: 'market',
      title: `Expressed Interest: ${listing ? listing.title : 'Marketplace Listing'}`,
      detail: `Pledged ${interestData.volumePledged}. Demonstration transaction recorded.`,
      plotOrUnit: 'Marketplace',
      status: 'completed',
    });

    return {
      success: true,
      message: `Your interest in "${listing?.title}" (${interestData.volumePledged}) has been registered in demo session.`,
    };
  },

  // --- 7. Expert Directory & Bookings ---
  async getExperts(): Promise<ExpertProfile[]> {
    await delay();
    return [...store.experts];
  },

  async requestExpertService(
    bookingData: Omit<ExpertServiceRequest, 'id' | 'status' | 'submittedAt'>
  ): Promise<ExpertServiceRequest> {
    await delay();
    const newBooking: ExpertServiceRequest = {
      ...bookingData,
      id: `req-${Date.now()}`,
      status: 'Pending Review',
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    store.expertRequests.push(newBooking);

    this.addActivity({
      category: 'report',
      title: `Requested Expert Consultation: ${newBooking.expertName}`,
      detail: `Booked ${newBooking.serviceType} for ${newBooking.farmPlotOrUnit}. Demonstration request recorded.`,
      plotOrUnit: newBooking.farmPlotOrUnit,
      status: 'scheduled',
    });

    return newBooking;
  },

  // --- 8. Farm Activity Ledger ---
  async getActivities(): Promise<FarmActivity[]> {
    await delay();
    return [...store.activities];
  },

  addActivity(activity: Omit<FarmActivity, 'id' | 'date' | 'timeAgo'>): FarmActivity {
    const today = new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
    const newAct: FarmActivity = {
      ...activity,
      id: `act-${Date.now()}`,
      date: today,
      timeAgo: 'Just now',
    };
    store.activities.unshift(newAct);
    return newAct;
  },

};
