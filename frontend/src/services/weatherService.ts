import type { Farm } from '../data/farmerData';

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  admin1?: string;
  timezone?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface OpenMeteoResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: Array<number | null>;
    precipitation_sum: number[];
    uv_index_max: number[];
  };
}

export interface LiveWeatherDay {
  date: string;
  weatherCode: number;
  highC: number;
  lowC: number;
  rainProbability: number | null;
  rainMm: number;
  uvIndex: number;
}

export interface LiveWeatherForecast {
  locationName: string;
  county: string;
  timezone: string;
  observedAt: string;
  current: OpenMeteoResponse['current'];
  days: LiveWeatherDay[];
}

interface CachedForecast {
  expiresAt: number;
  forecast: LiveWeatherForecast;
}

const CACHE_DURATION_MS = 15 * 60 * 1000;
const forecastCache = new Map<string, CachedForecast>();
const inFlightRequests = new Map<string, Promise<LiveWeatherForecast>>();

const readJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather service request failed (${response.status}). Please try again.`);
  }
  return response.json() as Promise<T>;
};

const getFarmLocation = async (farm: Farm): Promise<GeocodingResult> => {
  const locationParts = [farm.location, farm.subCounty, farm.county]
    .map((part) => part.trim())
    .filter((part, index, parts) => part && parts.indexOf(part) === index);
  const queries = [
    [locationParts[0], locationParts[1], 'Kenya'].filter(Boolean).join(', '),
    [farm.subCounty, farm.county, 'Kenya'].filter(Boolean).join(', '),
    [farm.county, 'Kenya'].filter(Boolean).join(', '),
  ].filter((query, index, queries) => query.length > 0 && queries.indexOf(query) === index);

  for (const query of queries) {
    const params = new URLSearchParams({
      name: query,
      count: '5',
      language: 'en',
      countryCode: 'KE',
      format: 'json',
    });
    const response = await readJson<GeocodingResponse>(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
    );
    const result = response.results?.find(
      (candidate) =>
        candidate.country_code.toUpperCase() === 'KE' &&
        Number.isFinite(candidate.latitude) &&
        Number.isFinite(candidate.longitude),
    );
    if (result) return result;
  }

  throw new Error(
    'Could not find this farm location for a weather forecast. Add a recognizable town or county in the farm details.',
  );
};

const getWeatherCodeDescription = (code: number): string => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if ([51, 53, 55].includes(code)) return 'Drizzle';
  if ([56, 57].includes(code)) return 'Freezing drizzle';
  if ([61, 63, 65].includes(code)) return 'Rain';
  if ([66, 67].includes(code)) return 'Freezing rain';
  if ([71, 73, 75, 77].includes(code)) return 'Snow';
  if ([80, 81, 82].includes(code)) return 'Rain showers';
  if ([85, 86].includes(code)) return 'Snow showers';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Conditions unavailable';
};

const loadForecast = async (farm: Farm): Promise<LiveWeatherForecast> => {
  const location = await getFarmLocation(farm);
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'uv_index_max',
    ].join(','),
    forecast_days: '7',
    timezone: 'auto',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
  });
  const response = await readJson<OpenMeteoResponse>(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  );

  if (
    !response.current ||
    !response.daily ||
    !Array.isArray(response.daily.time) ||
    !Number.isFinite(response.current.temperature_2m)
  ) {
    throw new Error('The weather service returned incomplete forecast data. Please try again later.');
  }

  return {
    locationName: location.name,
    county: location.admin1 || farm.county,
    timezone: response.timezone,
    observedAt: response.current.time,
    current: response.current,
    days: response.daily.time.map((date, index) => ({
      date,
      weatherCode: response.daily.weather_code[index],
      highC: response.daily.temperature_2m_max[index],
      lowC: response.daily.temperature_2m_min[index],
      rainProbability: response.daily.precipitation_probability_max[index],
      rainMm: response.daily.precipitation_sum[index],
      uvIndex: response.daily.uv_index_max[index],
    })),
  };
};

export const getWeatherDescription = getWeatherCodeDescription;

export const getLiveWeatherForecast = async (
  farm: Farm,
  forceRefresh = false,
): Promise<LiveWeatherForecast> => {
  const cacheKey = [farm.location, farm.subCounty, farm.county].join('|').toLowerCase();
  const cached = forecastCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.forecast;

  const existingRequest = inFlightRequests.get(cacheKey);
  if (!forceRefresh && existingRequest) return existingRequest;

  const request = loadForecast(farm)
    .then((forecast) => {
      forecastCache.set(cacheKey, {
        forecast,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      });
      return forecast;
    })
    .finally(() => {
      if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
  return request;
};
