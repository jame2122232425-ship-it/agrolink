import { FarmerProfile, Farm } from '../data/farmerData';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

interface RegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  password: string;
  password_confirm: string;
  farmer_profile?: {
    county?: string;
    sub_county?: string;
    ward?: string;
    village?: string;
    preferred_language?: 'en' | 'sw';
  };
}

interface ApiFarm {
  id: number;
  name: string;
  location: string;
  county: string;
  sub_county: string;
  size: number | string;
  farming_type: string;
  soil_type?: string;
  satellite_image?: string;
}

export interface NewFarmDetails {
  name: string;
  location: string;
  county: string;
  sub_county: string;
  size: number;
  farming_type: 'mixed' | 'crops' | 'livestock';
}

interface ApiCollection<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

export interface ApiPlot {
  id: number;
  farm: number;
  name: string;
  size: number | string;
  soil_type: string;
  soil_ph: number | string | null;
  irrigation_enabled: boolean;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiUser {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_joined: string;
}

export interface ApiNotification {
  id: number;
  notification_type: 'report' | 'crop' | 'livestock' | 'reminder' | 'community';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  action_url: string;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

export interface CommunityPost {
  id: number;
  title: string;
  body: string;
  topic: 'crops' | 'livestock' | 'soil' | 'weather' | 'markets' | 'general';
  county: string;
  status: 'open' | 'resolved';
  image: string | null;
  author_name: string;
  is_mine: boolean;
  reply_count: number;
  reaction_count: number;
  reacted_by_me: boolean;
  accepted_reply: number | null;
  accepted_reply_preview: { id: number; body: string; author_name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CommunityReply {
  id: number;
  post: number;
  body: string;
  author_name: string;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityContentReport {
  id: number;
  post: number | null;
  reply: number | null;
  reason: 'misinformation' | 'abuse' | 'spam' | 'privacy' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  target_title: string;
  created_at: string;
}

interface ApiFarmerProfile {
  user?: ApiUser;
  county: string;
  preferred_language: 'en' | 'sw';
  contact_phone: string;
  profile_picture: string | null;
}

export interface ApiCropGrowthStage {
  id: number;
  name: string;
  order: number;
}

export interface ApiCrop {
  id: number;
  farm: number;
  plot: number | null;
  plot_name: string | null;
  crop_name: string;
  variety: string;
  planting_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  area_planted: number | string;
  area_unit: string;
  planting_method: string;
  growth_stage: number | null;
  growth_stage_name: string | null;
  status: string;
  notes: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCropHealthRecord {
  id: number;
  crop: number;
  observation_date: string;
  symptoms_observed: string;
  general_condition: string;
  severity: string;
  notes: string;
  recorded_by: number | null;
  created_at: string;
}

export interface ApiCropActivity {
  id: number;
  crop: number;
  activity_type: string;
  activity_date: string;
  description: string;
  product_or_treatment: string;
  quantity: number | string | null;
  unit: string;
  created_at: string;
}

export interface ApiCropSummary {
  farm: number;
  total_crops: number;
  active_crops: number;
  approaching_harvest: number;
  growth_stage_distribution: Array<{ growth_stage: string; count: number }>;
}

export interface ApiLivestockGroup {
  id: number;
  farm: number;
  species: string;
  breed: string;
  group_name: string;
  animal_count: number;
  is_active: boolean;
  production_purpose: string;
  acquisition_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ApiAnimal {
  id: number;
  farm: number;
  group: number | null;
  identification_number: string;
  name_or_tag: string;
  species: string;
  breed: string;
  sex: string;
  birth_date: string | null;
  estimated_age_months: number | null;
  acquisition_date: string | null;
  production_purpose: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ApiLivestockHealthRecord {
  id: number;
  animal: number | null;
  group: number | null;
  observation_date: string;
  symptoms_reported: string;
  general_condition: string;
  severity: string;
  farmer_notes: string;
  created_at: string;
}

export interface ApiLivestockMedicalRecord {
  id: number;
  animal: number | null;
  group: number | null;
  record_type: string;
  product_or_vaccine: string;
  administration_date: string;
  dosage: number | string | null;
  dosage_unit: string;
  batch_number: string;
  administered_by: string;
  next_scheduled_date: string | null;
  notes: string;
  entry_type: string;
  created_at: string;
}

export interface ApiLivestockSummary {
  farm: number;
  total_animals: number;
  counts_by_species: Array<{ species: string; count: number }>;
  active_livestock_groups: number;
  upcoming_health_activities: Array<{
    type: string;
    date: string;
    description: string;
    subject: string;
  }>;
}

export interface ApiReport {
  id: number;
  report_reference: string;
  farm: number;
  plot: number | null;
  crop: number | null;
  livestock_group: number | null;
  animal: number | null;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  source: string;
  location_details: string;
  resolution_summary: string;
  submitted_at: string;
  updated_at: string;
}

export interface ApiReportUpdate {
  id: number;
  author_name: string | null;
  update_type: string;
  message: string;
  visible_to_farmer: boolean;
  created_at: string;
}

export interface ApiReportEvidence {
  id: number;
  image: string;
  caption: string;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface ApiFarmNote {
  id: number;
  farm: number;
  author: number | null;
  title: string;
  detail: string;
  category: string;
  note_date: string;
  created_at: string;
}

export interface ApiFarmActivityItem {
  id: string;
  source: string;
  source_id: number;
  category: string;
  title: string;
  detail: string;
  subject: string;
  location: string;
  date: string;
  status: string;
}

export interface ApiFarmActivityFeed {
  farm: number;
  count: number;
  results: ApiFarmActivityItem[];
}

export interface PlotDetails {
  name: string;
  size: number;
  soil_type?: string;
  soil_ph?: number | null;
  irrigation_enabled?: boolean;
  description?: string;
}

export interface CropDetails {
  farm: number;
  plot?: number | null;
  crop_name: string;
  variety?: string;
  planting_date?: string | null;
  expected_harvest_date?: string | null;
  area_planted: number;
  area_unit?: 'acres' | 'hectares' | 'square_metres';
  planting_method?: string;
  growth_stage?: number | null;
  status?: string;
  notes?: string;
}

export interface CropHealthDetails {
  crop: number;
  observation_date?: string;
  symptoms_observed: string;
  general_condition?: string;
  severity?: string;
  notes?: string;
}

export interface CropActivityDetails {
  crop: number;
  activity_type: string;
  activity_date?: string;
  description: string;
  product_or_treatment?: string;
  quantity?: number | null;
  unit?: string;
}

export interface LivestockGroupDetails {
  farm: number;
  species: string;
  breed?: string;
  group_name: string;
  animal_count?: number;
  is_active?: boolean;
  production_purpose?: string;
  acquisition_date?: string | null;
  notes?: string;
}

export interface AnimalDetails {
  farm: number;
  group?: number | null;
  identification_number?: string;
  name_or_tag?: string;
  species: string;
  breed?: string;
  sex?: 'female' | 'male' | 'unknown';
  birth_date?: string | null;
  estimated_age_months?: number | null;
  production_purpose?: string;
  status?: string;
  notes?: string;
}

export interface MedicalRecordDetails {
  animal?: number | null;
  group?: number | null;
  record_type: 'vaccination' | 'treatment';
  product_or_vaccine: string;
  administration_date?: string;
  dosage?: number | null;
  dosage_unit?: string;
  batch_number?: string;
  administered_by?: string;
  next_scheduled_date?: string | null;
  notes?: string;
}

export interface ReportDetails {
  farm: number;
  plot?: number | null;
  crop?: number | null;
  livestock_group?: number | null;
  animal?: number | null;
  title: string;
  description: string;
  category: string;
  severity: string;
  location_details?: string;
}

export interface FarmNoteDetails {
  title: string;
  detail?: string;
  category?: 'crop' | 'dairy' | 'soil' | 'report' | 'market';
  note_date?: string;
}

export interface FarmerProfileDetails {
  county?: string;
  sub_county?: string;
  ward?: string;
  village?: string;
  preferred_language?: 'en' | 'sw';
  contact_phone?: string;
  profile_information?: string;
}

export interface FarmDetails {
  name?: string;
  location?: string;
  county?: string;
  sub_county?: string;
  ward?: string;
  village?: string;
  size?: number;
  size_unit?: 'acres' | 'hectares';
  farming_type?: string;
  description?: string;
}

export interface AIStatus {
  enabled: boolean;
  provider: string;
  mock_mode: boolean;
  configured: boolean;
  available: boolean;
}

export interface AIConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface AIMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  image: string | null;
  is_demo: boolean;
  created_at: string;
}

export interface AIConversationDetail extends AIConversation {
  messages: AIMessage[];
}

export interface MarketCounty {
  id: number;
  name: string;
  code: string;
  slug: string;
}

export interface MarketDirectoryEntry {
  id: number;
  name: string;
  county: number;
  county_name: string;
  sub_county: string;
  market_type: string;
}

export interface MarketTradingUnit {
  id: number;
  name: string;
  abbreviation: string;
}

export interface MarketCoverage {
  active_counties: number;
  counties_with_prices: number;
  active_markets: number;
  markets_with_prices: number;
  markets_with_recent_prices: number;
  verified_observations: number;
  estimated_observations: number;
  counties: Array<{
    id: number;
    name: string;
    observation_count: number;
    market_count: number;
    commodity_count: number;
    recent_observation_count: number;
    latest_observation_date: string | null;
  }>;
}

export interface MarketOverview {
  crop_commodities: number;
  livestock_commodities: number;
  crop_categories: number;
  livestock_categories: number;
  coverage: MarketCoverage;
  latest_updates: MarketPriceObservation[];
}

export interface MarketWatchItem {
  id: number;
  commodity: number | null;
  commodity_name: string | null;
  county: number | null;
  county_name: string | null;
  market: number | null;
  market_name: string | null;
  created_at: string;
}

export interface MarketCommodityCategory {
  id: number;
  kind: 'crop' | 'livestock';
  name: string;
  slug: string;
  description: string;
}

export interface MarketCommodity {
  id: number;
  kind: 'crop' | 'livestock';
  category: number;
  category_name: string;
  name: string;
  slug: string;
  alternative_names: string[];
  description: string;
  scientific_name: string;
  price_basis: string;
  image_url: string;
}

export interface MarketCommoditySuggestionInput {
  kind: 'crop' | 'livestock';
  suggested_name: string;
  alternative_names: string[];
  category: number;
  description: string;
  price_basis?: string;
}

export interface MarketPriceObservation {
  id: number;
  commodity: number;
  market: number;
  county: number;
  unit: number;
  currency: string;
  commodity_name: string;
  commodity_kind: 'crop' | 'livestock';
  commodity_category: string;
  market_name: string;
  county_name: string;
  source_name: string;
  source_url: string;
  source_reference: string;
  price_type: 'wholesale' | 'retail' | 'farm_gate' | 'other';
  unit_name: string;
  unit_abbreviation: string;
  unit_quantity: string;
  minimum_price: string | null;
  maximum_price: string | null;
  average_price: string | null;
  variety_grade: string;
  livestock_price_basis: string;
  livestock_breed: string;
  animal_age_category: string;
  animal_sex: string;
  body_condition: string;
  animal_weight_kg: string | null;
  observation_date: string;
  published_at: string | null;
  status: 'verified' | 'estimated';
  age_days: number;
  freshness: 'fresh' | 'recent' | 'aging' | 'stale';
}

export interface MarketPriceQuery {
  search?: string;
  commodity?: number;
  county?: number;
  market?: number;
  unit?: number;
  priceType?: 'wholesale' | 'retail' | 'farm_gate' | 'other';
  kind?: 'crop' | 'livestock';
  observedAfter?: string;
  observedBefore?: string;
}

export interface MarketPriceTrend {
  count: number;
  results: MarketPriceObservation[];
  summary: {
    observation_count: number;
    period_average: string | null;
    lowest_observation_average: string | null;
    highest_observation_average: string | null;
    percentage_change_first_to_last: string | null;
    comparison_period: {
      first_observation_date: string | null;
      last_observation_date: string | null;
    };
    method: string;
  };
}

export interface MarketPriceComparisonGroup {
  unit: number;
  unit_name: string;
  unit_quantity: string;
  variety_grade: string;
  livestock_price_basis: string;
  market_count: number;
  lowest_market_average?: string;
  highest_market_average?: string;
  mean_of_market_averages?: string;
  difference_between_market_averages?: string;
  observations: MarketPriceObservation[];
}

export interface LivestockValuation {
  available: boolean;
  message: string;
  commodity_id?: number;
  commodity_name?: string;
  market_id: number;
  market_name: string;
  county_name: string;
  price_type?: string;
  price_basis: string;
  weight_kg?: string | null;
  animal_count?: number;
  minimum_value?: string;
  maximum_value?: string;
  average_value?: string | null;
  observation_date?: string;
  source_name?: string;
  source_url?: string;
  freshness?: string;
  status?: string;
  observation_count?: number;
}

interface ApiPage<T> {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

const ACCESS_TOKEN_KEY = 'agrolink_access_token';
const REFRESH_TOKEN_KEY = 'agrolink_refresh_token';

export const SESSION_EXPIRED_EVENT = 'agrolink-session-expired';

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  '/api/v1/auth/login/',
  '/api/v1/auth/register/',
  '/api/v1/auth/refresh/',
  '/api/v1/auth/logout/',
]);

const getHeaders = (init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? {});
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const clearSession = () => {
  const hadSession =
    localStorage.getItem(ACCESS_TOKEN_KEY) !== null ||
    localStorage.getItem(REFRESH_TOKEN_KEY) !== null;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  if (hadSession) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
};

let refreshRequest: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearSession();
    return Promise.resolve(null);
  }

  refreshRequest = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const data = (await response.json()) as { access?: string; refresh?: string };
      if (!data.access) {
        clearSession();
        return null;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      if (data.refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      }

      return data.access;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
};

const extractErrorMessage = (payload: unknown): string => {
  const collect = (value: unknown, depth = 0): string[] => {
    if (typeof value === 'string') {
      return value.trim() ? [value.trim()] : [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => collect(item, depth));
    }

    if (value && typeof value === 'object' && depth < 3) {
      const record = value as Record<string, unknown>;
      const preferredKeys = ['detail', 'error', 'message', 'non_field_errors'];
      const preferred = preferredKeys
        .filter((key) => key in record)
        .flatMap((key) => collect(record[key], depth + 1));

      if (preferred.length > 0) {
        return preferred;
      }

      const ignoredKeys = new Set(['code', 'messages', 'token_class', 'token_type']);
      return Object.entries(record)
        .filter(([key]) => !ignoredKeys.has(key))
        .flatMap(([, item]) => collect(item, depth + 1));
    }

    return [];
  };

  const messages = Array.from(new Set(collect(payload)));
  return messages.join(' ') || 'Request failed.';
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const target = `${API_BASE || ''}${path}`;
  const canRefresh = !AUTH_PATHS_WITHOUT_REFRESH.has(path);

  let response = await fetch(target, {
    ...init,
    headers: getHeaders(init),
    credentials: 'include',
  });

  if (response.status === 401 && canRefresh) {
    const token = await refreshAccessToken();
    if (token) {
      response = await fetch(target, {
        ...init,
        headers: getHeaders(init),
        credentials: 'include',
      });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && canRefresh) {
      clearSession();
      throw new Error('Your session has expired. Please sign in again.');
    }

    throw new Error(extractErrorMessage(payload));
  }

  return payload as T;
}

const authorizedFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  let response = await fetch(url, {
    ...init,
    headers: getHeaders(init),
    credentials: 'include',
  });

  if (response.status === 401) {
    const token = await refreshAccessToken();
    if (token) {
      response = await fetch(url, {
        ...init,
        headers: getHeaders(init),
        credentials: 'include',
      });
    }
  }

  return response;
};

const toFarm = (farm: ApiFarm): Farm => ({
  id: String(farm.id),
  name: farm.name ?? 'Farm',
  location: farm.location || farm.county || 'Farm location',
  county: farm.county ?? 'Unknown county',
  subCounty: farm.sub_county ?? 'Unknown sub-county',
  totalAcres: Number(farm.size ?? 0),
  primaryEnterprise: farm.farming_type ?? 'mixed',
  soilType: farm.soil_type ?? 'Mixed soil',
  satelliteImage: farm.satellite_image,
});

const toFarmerProfile = (profile: ApiFarmerProfile): FarmerProfile => {
  const firstName = profile.user?.first_name ?? '';
  const lastName = profile.user?.last_name ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Farmer';

  return {
    id: String(profile.user?.id ?? ''),
    fullName,
    preferredName: firstName,
    avatarInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
    profilePictureUrl: profile.profile_picture,
    phoneNumber: profile.user?.phone_number ?? profile.contact_phone ?? '',
    nationalIdNumber: '',
    county: profile.county ?? '',
    activeFarmId: '',
    farms: [],
    language: profile.preferred_language === 'sw' ? 'Kiswahili' : 'English',
    memberSince: profile.user?.date_joined ?? '',
  };
};

const toRequestPath = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
};

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

async function requestAllPages<T>(path: string): Promise<T[]> {
  const first = await request<T[] | ApiCollection<T>>(path);
  if (Array.isArray(first)) {
    return first;
  }

  const results = [...first.results];
  let next = first.next ?? null;
  let guard = 0;

  while (next && guard < 50) {
    guard += 1;
    const page = await request<ApiCollection<T>>(toRequestPath(next));
    results.push(...page.results);
    next = page.next ?? null;
  }

  return results;
}

export const apiService = {
  async register(data: RegistrationData) {
    return request<{ id: number; email: string }>('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(email: string, password: string) {
    const result = await request<{ access: string; refresh: string }>('/api/v1/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(ACCESS_TOKEN_KEY, result.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh);
    return result;
  },

  async logout() {
    try {
      const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refresh) {
        return;
      }

      try {
        await request('/api/v1/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      } catch {
        // The access token may have expired. Refresh once, then blacklist the
        // rotated refresh token so signing out also revokes the session server-side.
        if (await refreshAccessToken()) {
          const rotatedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (rotatedRefresh) {
            await request('/api/v1/auth/logout/', {
              method: 'POST',
              body: JSON.stringify({ refresh: rotatedRefresh }),
            });
          }
        }
      }
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getFarmerProfile(): Promise<FarmerProfile> {
    const profile = await request<ApiFarmerProfile>('/api/v1/farmer/profile/');
    return toFarmerProfile(profile);
  },

  async getFarms(): Promise<Farm[]> {
    const response = await request<ApiFarm[] | { results: ApiFarm[] }>('/api/v1/farms/');
    const farms = Array.isArray(response) ? response : response.results;
    return farms.map((farm) => toFarm(farm));
  },

  async createFarm(data: NewFarmDetails): Promise<Farm> {
    const farm = await request<ApiFarm>('/api/v1/farms/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return toFarm(farm);
  },

  async getPlots(farmId: string | number): Promise<ApiPlot[]> {
    return requestAllPages<ApiPlot>(`/api/v1/farms/${farmId}/plots/`);
  },

  async createPlot(farmId: string | number, data: PlotDetails): Promise<ApiPlot> {
    return request<ApiPlot>(`/api/v1/farms/${farmId}/plots/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePlot(
    farmId: string | number,
    plotId: string | number,
    data: Partial<PlotDetails>,
  ): Promise<ApiPlot> {
    return request<ApiPlot>(`/api/v1/farms/${farmId}/plots/${plotId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deletePlot(farmId: string | number, plotId: string | number): Promise<void> {
    return request<void>(`/api/v1/farms/${farmId}/plots/${plotId}/`, {
      method: 'DELETE',
    });
  },

  async getCrops(farmId?: string | number): Promise<ApiCrop[]> {
    return requestAllPages<ApiCrop>(
      withQuery('/api/v1/crops/', {
        farm: farmId,
        page_size: 100,
        ordering: '-created_at',
      }),
    );
  },

  async createCrop(data: CropDetails): Promise<ApiCrop> {
    return request<ApiCrop>('/api/v1/crops/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCrop(cropId: string | number, data: Partial<CropDetails>): Promise<ApiCrop> {
    return request<ApiCrop>(`/api/v1/crops/${cropId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCrop(cropId: string | number): Promise<void> {
    return request<void>(`/api/v1/crops/${cropId}/`, { method: 'DELETE' });
  },

  async getCropGrowthStages(): Promise<ApiCropGrowthStage[]> {
    return request<ApiCropGrowthStage[]>('/api/v1/crop-growth-stages/');
  },

  async getCropHealthRecords(farmId?: string | number): Promise<ApiCropHealthRecord[]> {
    return requestAllPages<ApiCropHealthRecord>(
      withQuery('/api/v1/crop-health-records/', {
        farm: farmId,
        page_size: 100,
        ordering: '-observation_date',
      }),
    );
  },

  async createCropHealthRecord(data: CropHealthDetails): Promise<ApiCropHealthRecord> {
    return request<ApiCropHealthRecord>('/api/v1/crop-health-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCropActivities(farmId?: string | number): Promise<ApiCropActivity[]> {
    return requestAllPages<ApiCropActivity>(
      withQuery('/api/v1/crop-activities/', {
        farm: farmId,
        page_size: 100,
        ordering: '-activity_date',
      }),
    );
  },

  async createCropActivity(data: CropActivityDetails): Promise<ApiCropActivity> {
    return request<ApiCropActivity>('/api/v1/crop-activities/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCropSummary(farmId: string | number): Promise<ApiCropSummary> {
    return request<ApiCropSummary>(`/api/v1/farms/${farmId}/crop-summary/`);
  },

  async getLivestockGroups(farmId?: string | number): Promise<ApiLivestockGroup[]> {
    return requestAllPages<ApiLivestockGroup>(
      withQuery('/api/v1/livestock/groups/', {
        farm: farmId,
        page_size: 100,
        ordering: 'species',
      }),
    );
  },

  async createLivestockGroup(data: LivestockGroupDetails): Promise<ApiLivestockGroup> {
    return request<ApiLivestockGroup>('/api/v1/livestock/groups/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLivestockGroup(
    groupId: string | number,
    data: Partial<LivestockGroupDetails>,
  ): Promise<ApiLivestockGroup> {
    return request<ApiLivestockGroup>(`/api/v1/livestock/groups/${groupId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getAnimals(
    farmId?: string | number,
    groupId?: string | number,
  ): Promise<ApiAnimal[]> {
    return requestAllPages<ApiAnimal>(
      withQuery('/api/v1/livestock/animals/', {
        farm: farmId,
        group: groupId,
        page_size: 100,
        ordering: 'species',
      }),
    );
  },

  async createAnimal(data: AnimalDetails): Promise<ApiAnimal> {
    return request<ApiAnimal>('/api/v1/livestock/animals/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAnimal(animalId: string | number, data: Partial<AnimalDetails>): Promise<ApiAnimal> {
    return request<ApiAnimal>(`/api/v1/livestock/animals/${animalId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getLivestockHealthRecords(
    farmId?: string | number,
  ): Promise<ApiLivestockHealthRecord[]> {
    return requestAllPages<ApiLivestockHealthRecord>(
      withQuery('/api/v1/livestock/health-records/', {
        farm: farmId,
        page_size: 100,
        ordering: '-observation_date',
      }),
    );
  },

  async createLivestockHealthRecord(data: {
    animal?: number | null;
    group?: number | null;
    observation_date?: string;
    symptoms_reported: string;
    general_condition?: string;
    severity?: string;
    farmer_notes?: string;
  }): Promise<ApiLivestockHealthRecord> {
    return request<ApiLivestockHealthRecord>('/api/v1/livestock/health-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getLivestockMedicalRecords(
    farmId?: string | number,
  ): Promise<ApiLivestockMedicalRecord[]> {
    return requestAllPages<ApiLivestockMedicalRecord>(
      withQuery('/api/v1/livestock/medical-records/', {
        farm: farmId,
        page_size: 100,
        ordering: '-administration_date',
      }),
    );
  },

  async createLivestockMedicalRecord(
    data: MedicalRecordDetails,
  ): Promise<ApiLivestockMedicalRecord> {
    return request<ApiLivestockMedicalRecord>('/api/v1/livestock/medical-records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getLivestockSummary(farmId: string | number): Promise<ApiLivestockSummary> {
    return request<ApiLivestockSummary>(`/api/v1/farms/${farmId}/livestock-summary/`);
  },

  async getReports(): Promise<ApiReport[]> {
    return requestAllPages<ApiReport>(
      '/api/v1/reports/?page_size=100&ordering=-submitted_at',
    );
  },

  async getNotifications(): Promise<ApiNotification[]> {
    return requestAllPages<ApiNotification>('/api/v1/notifications/?page_size=100');
  },

  async markNotificationRead(notificationId: string | number): Promise<ApiNotification> {
    return request<ApiNotification>(`/api/v1/notifications/${notificationId}/read/`, {
      method: 'POST',
    });
  },

  async markAllNotificationsRead(): Promise<{ updated_count: number }> {
    return request<{ updated_count: number }>('/api/v1/notifications/read-all/', {
      method: 'POST',
    });
  },

  async getCommunityPosts(query: {
    search?: string;
    topic?: string;
    county?: string;
    unanswered?: boolean;
    ordering?: 'recent' | 'popular';
    page?: number;
  } = {}, signal?: AbortSignal): Promise<ApiPage<CommunityPost>> {
    const params = new URLSearchParams({ page_size: '20' });
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
    });
    return request<ApiPage<CommunityPost>>(`/api/v1/community/posts/?${params.toString()}`, { signal });
  },

  async createCommunityPost(data: FormData): Promise<CommunityPost> {
    return request<CommunityPost>('/api/v1/community/posts/', { method: 'POST', body: data });
  },

  async getCommunityPost(postId: number): Promise<CommunityPost> {
    return request<CommunityPost>(`/api/v1/community/posts/${postId}/`);
  },

  async toggleCommunityReaction(postId: number): Promise<{ reacted: boolean; reaction_count: number }> {
    return request(`/api/v1/community/posts/${postId}/react/`, { method: 'POST', body: JSON.stringify({}) });
  },

  async getCommunityReplies(postId: number): Promise<CommunityReply[]> {
    return request<CommunityReply[]>(`/api/v1/community/posts/${postId}/replies/`);
  },

  async createCommunityReply(postId: number, body: string): Promise<CommunityReply> {
    return request<CommunityReply>(`/api/v1/community/posts/${postId}/replies/`, {
      method: 'POST', body: JSON.stringify({ body }),
    });
  },

  async deleteCommunityReply(replyId: number): Promise<void> {
    return request<void>(`/api/v1/community/replies/${replyId}/`, { method: 'DELETE' });
  },

  async acceptCommunityReply(postId: number, replyId: number): Promise<CommunityPost> {
    return request<CommunityPost>(`/api/v1/community/posts/${postId}/accept-reply/`, {
      method: 'POST', body: JSON.stringify({ reply: replyId }),
    });
  },

  async reportCommunityContent(data: { post?: number; reply?: number; reason: string; details?: string }): Promise<CommunityContentReport> {
    return request<CommunityContentReport>('/api/v1/community/reports/', {
      method: 'POST', body: JSON.stringify(data),
    });
  },

  async getCommunityModerationReports(): Promise<CommunityContentReport[]> {
    return request<CommunityContentReport[]>('/api/v1/community/moderation/reports/');
  },

  async reviewCommunityReport(reportId: number, decision: 'hide' | 'dismiss'): Promise<CommunityContentReport> {
    return request<CommunityContentReport>(`/api/v1/community/moderation/reports/${reportId}/`, {
      method: 'PATCH', body: JSON.stringify({ decision }),
    });
  },

  async getReportUpdates(reportId: string | number): Promise<ApiReportUpdate[]> {
    return requestAllPages<ApiReportUpdate>(
      `/api/v1/reports/${reportId}/updates/`,
    );
  },

  async getReportEvidence(reportId: string | number): Promise<ApiReportEvidence[]> {
    return requestAllPages<ApiReportEvidence>(`/api/v1/reports/${reportId}/evidence/`);
  },

  async createReport(data: ReportDetails): Promise<ApiReport> {
    return request<ApiReport>('/api/v1/reports/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadReportEvidence(
    reportId: string | number,
    file: File,
    caption = '',
  ): Promise<void> {
    const body = new FormData();
    body.append('image', file);
    if (caption) {
      body.append('caption', caption);
    }
    return request<void>(`/api/v1/reports/${reportId}/evidence/`, {
      method: 'POST',
      body,
    });
  },

  async getFarmActivityFeed(
    farmId: string | number,
    limit = 100,
  ): Promise<ApiFarmActivityFeed> {
    return request<ApiFarmActivityFeed>(
      withQuery(`/api/v1/farms/${farmId}/activity-feed/`, { limit }),
    );
  },

  async getFarmNotes(farmId: string | number): Promise<ApiFarmNote[]> {
    return request<ApiFarmNote[] | ApiCollection<ApiFarmNote>>(
      `/api/v1/farms/${farmId}/notes/`,
    ).then((response) => (Array.isArray(response) ? response : response.results));
  },

  async createFarmNote(
    farmId: string | number,
    data: FarmNoteDetails,
  ): Promise<ApiFarmNote> {
    return request<ApiFarmNote>(`/api/v1/farms/${farmId}/notes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFarm(farmId: string | number, data: FarmDetails): Promise<Farm> {
    const farm = await request<ApiFarm>(
      `/api/v1/farms/${farmId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
    return toFarm(farm);
  },

  async updateFarmerProfile(data: FarmerProfileDetails): Promise<FarmerProfile> {
    const profile = await request<ApiFarmerProfile>('/api/v1/farmer/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return toFarmerProfile(profile);
  },

  async uploadFarmerProfilePicture(file: File): Promise<FarmerProfile> {
    const body = new FormData();
    body.append('profile_picture', file);
    const profile = await request<ApiFarmerProfile>('/api/v1/farmer/profile/', {
      method: 'PATCH',
      body,
    });
    return toFarmerProfile(profile);
  },

  async getFarmPlotCount(farms: Farm[]): Promise<number> {
    const responses = await Promise.all(
      farms.map((farm) =>
        request<ApiPlot[] | ApiCollection<ApiPlot>>(`/api/v1/farms/${farm.id}/plots/`),
      ),
    );

    return responses.reduce(
      (total, response) => total + (Array.isArray(response) ? response.length : response.count),
      0,
    );
  },

  async getLivestockHerdCount(): Promise<number> {
    const response = await request<ApiLivestockGroup[] | ApiCollection<ApiLivestockGroup>>(
      '/api/v1/livestock/groups/?is_active=true&page_size=1',
    );
    return Array.isArray(response) ? response.length : response.count;
  },

  async getAIStatus(): Promise<AIStatus> {
    return request<AIStatus>('/api/v1/ai/status/');
  },

  async getMarketCounties(signal?: AbortSignal): Promise<MarketCounty[]> {
    return request<MarketCounty[]>('/api/v1/market/counties/', { signal });
  },

  async getMarketMarkets(county: number, signal?: AbortSignal): Promise<ApiPage<MarketDirectoryEntry>> {
    const params = new URLSearchParams({ county: String(county), page_size: '100' });
    return request<ApiPage<MarketDirectoryEntry>>(`/api/v1/market/markets/?${params.toString()}`, { signal });
  },

  async getMarketTradingUnits(signal?: AbortSignal): Promise<MarketTradingUnit[]> {
    return request<MarketTradingUnit[]>('/api/v1/market/units/', { signal });
  },

  async getMarketCommodityCategories(
    kind: 'crop' | 'livestock',
    signal?: AbortSignal,
  ): Promise<MarketCommodityCategory[]> {
    const params = new URLSearchParams({ kind });
    return request<MarketCommodityCategory[]>(
      `/api/v1/market/categories/?${params.toString()}`,
      { signal },
    );
  },

  async getMarketCommodities(
    kind: 'crop' | 'livestock',
    search: string,
    category?: number,
    signal?: AbortSignal,
  ): Promise<ApiPage<MarketCommodity>> {
    const params = new URLSearchParams({ kind, page_size: '30' });
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', String(category));
    return request<ApiPage<MarketCommodity>>(
      `/api/v1/market/commodities/?${params.toString()}`,
      { signal },
    );
  },

  async suggestMarketCommodity(data: MarketCommoditySuggestionInput): Promise<{ id: number }> {
    return request<{ id: number }>('/api/v1/market/commodity-suggestions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMarketPrices(
    query: MarketPriceQuery = {},
    signal?: AbortSignal,
  ): Promise<ApiPage<MarketPriceObservation>> {
    const params = new URLSearchParams({ page_size: '100', ordering: '-observation_date' });
    if (query.search?.trim()) {
      params.set('search', query.search.trim());
    }
    if (query.commodity) {
      params.set('commodity', String(query.commodity));
    }
    if (query.county) {
      params.set('county', String(query.county));
    }
    if (query.market) {
      params.set('market', String(query.market));
    }
    if (query.kind) {
      params.set('kind', query.kind);
    }
    if (query.unit) {
      params.set('unit', String(query.unit));
    }
    if (query.priceType) {
      params.set('price_type', query.priceType);
    }
    return request<ApiPage<MarketPriceObservation>>(
      `/api/v1/market/prices/?${params.toString()}`,
      { signal },
    );
  },

  async getMarketPriceHistory(
    observationId: number,
    signal?: AbortSignal,
  ): Promise<ApiPage<MarketPriceObservation>> {
    return request<ApiPage<MarketPriceObservation>>(
      `/api/v1/market/prices/${observationId}/history/?page_size=30`,
      { signal },
    );
  },

  async getMarketCoverage(signal?: AbortSignal): Promise<MarketCoverage> {
    return request<MarketCoverage>('/api/v1/market/coverage/', { signal });
  },

  async getMarketOverview(signal?: AbortSignal): Promise<MarketOverview> {
    return request<MarketOverview>('/api/v1/market/overview/', { signal });
  },

  async getMarketPriceTrend(query: {
    commodity: number;
    unit: number;
    unitQuantity: string;
    priceType: string;
    market?: number;
    county?: number;
    varietyGrade?: string;
    observedAfter?: string;
    observedBefore?: string;
  }, signal?: AbortSignal): Promise<MarketPriceTrend> {
    const params = new URLSearchParams({
      commodity: String(query.commodity),
      unit: String(query.unit),
      unit_quantity: query.unitQuantity,
      price_type: query.priceType,
      page_size: '100',
    });
    if (query.market) params.set('market', String(query.market));
    if (query.county) params.set('county', String(query.county));
    if (query.varietyGrade !== undefined) params.set('variety_grade', query.varietyGrade);
    if (query.priceType) params.set('price_type', query.priceType);
    if (query.observedAfter) params.set('observed_after', query.observedAfter);
    if (query.observedBefore) params.set('observed_before', query.observedBefore);
    return request<MarketPriceTrend>(`/api/v1/market/prices/trend/?${params.toString()}`, { signal });
  },

  async compareMarketPrices(data: {
    commodity: number;
    county?: number;
    markets: number[];
    price_type: string;
    observed_after?: string;
    observed_before?: string;
    unit?: number;
    variety_grade?: string;
  }, signal?: AbortSignal): Promise<{
    commodity: string;
    price_type: string;
    comparison_method: string;
    groups: MarketPriceComparisonGroup[];
  }> {
    return request('/api/v1/market/comparisons/', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  },

  async getLivestockValuation(data: {
    commodity: number;
    market: number;
    price_type: string;
    weight_kg?: string;
    animal_count: number;
    breed?: string;
    age_category?: string;
  }): Promise<LivestockValuation> {
    return request('/api/v1/market/livestock/valuation/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMarketWatchlist(signal?: AbortSignal): Promise<ApiPage<MarketWatchItem>> {
    return request('/api/v1/market/watchlist/?page_size=100', { signal });
  },

  async addMarketWatch(data: {
    commodity?: number;
    county?: number;
    market?: number;
  }): Promise<MarketWatchItem> {
    return request('/api/v1/market/watchlist/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeMarketWatch(id: number): Promise<void> {
    return request(`/api/v1/market/watchlist/${id}/`, { method: 'DELETE' });
  },

  async getAIConversations(): Promise<AIConversation[]> {
    return request<AIConversation[]>('/api/v1/ai/conversations/');
  },

  async createAIConversation(): Promise<AIConversation> {
    return request<AIConversation>('/api/v1/ai/conversations/', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async getAIConversation(id: number): Promise<AIConversationDetail> {
    return request<AIConversationDetail>(`/api/v1/ai/conversations/${id}/`);
  },

  async sendAIMessage(
    conversationId: number,
    content: string,
    image?: File | null,
  ): Promise<AIMessage> {
    let body: FormData | string = JSON.stringify({ content });
    if (image) {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('image', image);
      body = formData;
    }

    const response = await request<{ assistant_message: AIMessage }>(
      `/api/v1/ai/conversations/${conversationId}/messages/`,
      {
        method: 'POST',
        body,
      },
    );
    return response.assistant_message;
  },

  async fetchPrivateImage(url: string): Promise<string> {
    let imagePath = url;
    try {
      const parsedUrl = new URL(url, window.location.origin);
      if (parsedUrl.pathname.startsWith('/api/v1/private-images/')) {
        imagePath = `${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch {
      // Keep the supplied URL and let the authenticated request report any failure.
    }
    const target = imagePath.startsWith('/') ? `${API_BASE}${imagePath}` : imagePath;
    const response = await authorizedFetch(target);

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'The image could not be loaded.',
      );
    }

    return URL.createObjectURL(await response.blob());
  },
};
