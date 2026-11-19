import React from 'react';
import { Link } from 'react-router-dom';
import {
  Cloud,
  CloudRain,
  CloudSun,
  CloudSunRain,
  Droplets,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { useFarmWeather } from '../../hooks/useFarmWeather';
import { getWeatherDescription } from '../../services/weatherService';
import { Card } from '../../design-system/components/Card';
import { Select } from '../../design-system/components/Select';

const weatherIcon = (weatherCode: number, className = 'h-7 w-7') => {
  if (weatherCode === 0) return <Sun className={className} />;
  if (weatherCode <= 2) return <CloudSun className={className} />;
  if ([45, 48, 3].includes(weatherCode)) return <Cloud className={className} />;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return <CloudRain className={className} />;
  }
  return <CloudSunRain className={className} />;
};

const formatForecastDate = (date: string) =>
  new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`));

export const WeatherPage: React.FC = () => {
  const { farms, activeFarm, farmsLoading, switchFarm } = useFarmer();
  const { forecast, isLoading, error, refresh } = useFarmWeather(
    activeFarm.id ? activeFarm : null,
  );

  const rainDays = forecast?.days.filter(
    (day) => day.rainMm >= 20 || (day.rainProbability !== null && day.rainProbability >= 70),
  ) ?? [];
  const hasDryForecast = forecast?.days.slice(0, 3).every(
    (day) => day.rainMm < 1 && (day.rainProbability === null || day.rainProbability < 30),
  ) ?? false;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
            Live weather · Open-Meteo
          </p>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-slate-900">
            <CloudSunRain className="h-7 w-7 text-[#16A34A]" />
            Weather forecast
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Local conditions and a seven-day forecast.
          </p>
        </div>

        {farms.length > 0 && (
          <div className="flex items-end gap-2">
            {farms.length > 1 && (
              <div className="min-w-48">
                <Select
                  label="Forecast for"
                  value={activeFarm.id}
                  onChange={(event) => switchFarm(event.target.value)}
                  disabled={farmsLoading || isLoading}
                  options={farms.map((farm) => ({
                    value: farm.id,
                    label: farm.name,
                  }))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading || farmsLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {farmsLoading ? (
        <Card padding="lg" className="text-center">
          <CloudSunRain className="mx-auto h-10 w-10 animate-pulse text-emerald-700" />
          <p className="mt-3 text-sm text-slate-600">Loading farm details...</p>
        </Card>
      ) : farms.length === 0 ? (
        <Card padding="lg" className="border-dashed border-slate-300 text-center">
          <MapPin className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Register a farm to view local weather</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Add your farm location so AgroLink can find the nearest weather forecast.
          </p>
          <Link
            to="/farm"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3d21]"
          >
            View My Farms
          </Link>
        </Card>
      ) : isLoading && !forecast ? (
        <Card padding="lg" className="text-center">
          <CloudSunRain className="mx-auto h-10 w-10 animate-pulse text-emerald-700" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Getting the local forecast</h2>
          <p className="mt-2 text-sm text-slate-600">
            Finding the nearest location for {activeFarm.name}.
          </p>
        </Card>
      ) : error && !forecast ? (
        <Card padding="lg" className="border-red-200 bg-red-50/50 text-center">
          <CloudSunRain className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Weather forecast unavailable</h2>
          <p role="alert" className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-700">
            {error}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#14532D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f3d21]"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </Card>
      ) : forecast ? (
        <>
          <Card padding="none" className="overflow-hidden border-emerald-900 bg-[#14532D] text-white">
            <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <MapPin className="h-4 w-4" />
                  {forecast.locationName}{forecast.county ? `, ${forecast.county}` : ''}
                </p>
                <p className="mt-5 text-6xl font-bold tracking-tight">
                  {Math.round(forecast.current.temperature_2m)}°
                  <span className="ml-1 text-2xl font-medium text-emerald-200">C</span>
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {getWeatherDescription(forecast.current.weather_code)}
                </p>
                <p className="mt-1 text-xs text-emerald-200">
                  Feels like {Math.round(forecast.current.apparent_temperature)}°C
                </p>
              </div>

              <div className="flex items-center justify-center text-emerald-100">
                {weatherIcon(forecast.current.weather_code, 'h-24 w-24')}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <span className="flex items-center gap-2 text-xs text-emerald-200">
                    <Droplets className="h-4 w-4" /> Humidity
                  </span>
                  <strong className="mt-1 block">{forecast.current.relative_humidity_2m}%</strong>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <span className="flex items-center gap-2 text-xs text-emerald-200">
                    <Wind className="h-4 w-4" /> Wind
                  </span>
                  <strong className="mt-1 block">{Math.round(forecast.current.wind_speed_10m)} km/h</strong>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <span className="flex items-center gap-2 text-xs text-emerald-200">
                    <CloudRain className="h-4 w-4" /> Precipitation
                  </span>
                  <strong className="mt-1 block">{forecast.current.precipitation} mm</strong>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <span className="flex items-center gap-2 text-xs text-emerald-200">
                    <Thermometer className="h-4 w-4" /> Updated
                  </span>
                  <strong className="mt-1 block">{forecast.observedAt.split('T')[1]?.slice(0, 5) || '—'}</strong>
                </div>
              </div>
            </div>
          </Card>

          <section aria-labelledby="seven-day-forecast-heading">
            <div className="mb-3">
              <h2 id="seven-day-forecast-heading" className="text-lg font-bold text-slate-900">
                Seven-day forecast
              </h2>
              <p className="text-sm text-slate-500">
                Daily temperatures, rain probability, and expected rainfall.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {forecast.days.map((day, index) => (
                <Card key={day.date} padding="sm" className="text-center">
                  <p className="text-xs font-bold text-slate-700">
                    {index === 0 ? 'Today' : formatForecastDate(day.date)}
                  </p>
                  <div className="my-3 flex justify-center text-emerald-700">
                    {weatherIcon(day.weatherCode)}
                  </div>
                  <p className="text-xs text-slate-600">{getWeatherDescription(day.weatherCode)}</p>
                  <p className="mt-2 font-bold text-slate-900">
                    {Math.round(day.highC)}° <span className="font-medium text-slate-500">/ {Math.round(day.lowC)}°</span>
                  </p>
                  <p className="mt-2 text-xs text-blue-700">
                    {day.rainProbability === null ? 'Rain chance unavailable' : `${day.rainProbability}% rain chance`}
                  </p>
                  <p className="text-xs text-slate-500">{day.rainMm.toFixed(1)} mm expected</p>
                  <p className="mt-1 text-xs text-slate-500">UV {day.uvIndex.toFixed(1)}</p>
                </Card>
              ))}
            </div>
          </section>

          <Card padding="md" className="border-emerald-200 bg-emerald-50/60">
            <h2 className="font-bold text-slate-900">Farm planning outlook</h2>
            {rainDays.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Rain is likely on{' '}
                {rainDays.map((day) => formatForecastDate(day.date)).join(', ')}.
                Check drainage and local conditions before field work.
              </p>
            ) : hasDryForecast ? (
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Little rainfall is forecast in the next few days. Check soil moisture and crop needs
                before deciding whether irrigation is needed.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Use the daily rainfall outlook to plan field work, and confirm conditions locally
                before making farm management decisions.
              </p>
            )}
            {isLoading && <p className="mt-2 text-xs text-slate-500">Refreshing forecast...</p>}
            {error && (
              <p role="status" className="mt-2 text-xs text-amber-800">
                Could not refresh the latest forecast. Showing the most recently loaded data.
              </p>
            )}
          </Card>

          <p className="text-xs leading-5 text-slate-500">
            Forecast location is the nearest geocoded town, not a farm weather station. Data:
            {' '}<a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-800 underline underline-offset-2"
            >
              Open-Meteo
            </a>
            . Forecasts may differ from conditions at the farm.
          </p>
        </>
      ) : null}
    </div>
  );
};
