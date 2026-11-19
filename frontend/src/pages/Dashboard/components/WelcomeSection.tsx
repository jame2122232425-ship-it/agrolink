import React from 'react';
import { Cloud, CloudRain, CloudSun, CloudSunRain, MapPin, Calendar, ArrowRight, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFarmer } from '../../../context/FarmerContext';
import { useFarmWeather } from '../../../hooks/useFarmWeather';
import { getWeatherDescription } from '../../../services/weatherService';

export const WelcomeSection: React.FC = () => {
  const { farmer, activeFarm, farms, totalFarmAcres, language, plots } = useFarmer();
  const { forecast, isLoading, error } = useFarmWeather(activeFarm.id ? activeFarm : null);

  const today = new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const greeting = farmer.preferredName
    ? language === 'Kiswahili'
      ? `Habari ya asubuhi, ${farmer.preferredName}!`
      : `Good morning, ${farmer.preferredName}!`
    : 'Welcome to your farm dashboard';
  const currentWeatherIcon = forecast
    ? forecast.current.weather_code === 0
      ? Sun
      : forecast.current.weather_code <= 2
        ? CloudSun
        : [3, 45, 48].includes(forecast.current.weather_code)
          ? Cloud
          : CloudRain
    : CloudSunRain;
  const WeatherIcon = currentWeatherIcon;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#14532D] text-white shadow-lg border border-emerald-800">
      <div className="absolute inset-0 z-0">
        {activeFarm.satelliteImage && (
          <img
            src={activeFarm.satelliteImage}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-25 mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#14532D] via-[#14532D]/95 to-[#14532D]/85" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 p-5 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 font-semibold backdrop-blur-xs border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#86EFAC] animate-pulse" />
              <span>{activeFarm.name}</span>
            </span>
            <span className="text-emerald-300">·</span>
            <span className="flex items-center gap-1 text-emerald-200/90 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#86EFAC]" />
              {activeFarm.location}
            </span>
            <span className="text-emerald-300">·</span>
            <span className="flex items-center gap-1 text-emerald-200/90 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#86EFAC]" />
              {today}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {greeting}
          </h1>

          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Your farm at a glance.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-emerald-200 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#86EFAC]" />
              {totalFarmAcres.toLocaleString(undefined, { maximumFractionDigits: 2 })} total acres
              {' '}across {farms.length} {farms.length === 1 ? 'farm' : 'farms'}
            </span>
            <span>·</span>
            <Link
              to="/farm"
              className="min-h-11 rounded-lg text-white hover:text-[#86EFAC] font-semibold underline underline-offset-4 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86EFAC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14532D]"
            >
              <span>View all farms</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex flex-row lg:flex-col gap-3 shrink-0">
          <Link
            to="/weather"
            className="flex-1 lg:flex-none p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-4 shadow-xs hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86EFAC]"
            aria-label="View local weather forecast"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 text-[#86EFAC] flex items-center justify-center shrink-0">
              <WeatherIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tracking-tight">Weather</span>
                <span className="text-sm text-emerald-200 font-medium">
                  {forecast
                    ? `${Math.round(forecast.current.temperature_2m)}°C`
                    : isLoading
                      ? 'Loading'
                      : 'Unavailable'}
                </span>
              </div>
              <span className="text-sm text-emerald-100 block">
                {forecast
                  ? getWeatherDescription(forecast.current.weather_code)
                  : error
                    ? 'Open for forecast details'
                    : isLoading
                      ? 'Getting local forecast...'
                      : 'Open for local forecast'}
              </span>
            </div>
          </Link>

          <div className="hidden sm:flex p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Soil Status</span>
              <span className="font-bold text-white font-mono">{activeFarm.soilType || 'Not recorded'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Active Plots</span>
              <span className="font-bold text-white font-mono">{plots.length} recorded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
