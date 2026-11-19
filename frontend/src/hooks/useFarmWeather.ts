import { useCallback, useEffect, useRef, useState } from 'react';
import type { Farm } from '../data/farmerData';
import {
  getLiveWeatherForecast,
  type LiveWeatherForecast,
} from '../services/weatherService';

interface FarmWeatherState {
  farmId: string | null;
  forecast: LiveWeatherForecast | null;
  isLoading: boolean;
  error: string | null;
}

export const useFarmWeather = (farm: Farm | null) => {
  const [state, setState] = useState<FarmWeatherState>({
    farmId: null,
    forecast: null,
    isLoading: Boolean(farm),
    error: null,
  });
  const [refreshVersion, setRefreshVersion] = useState(0);
  const forceRefresh = useRef(false);

  const farmId = farm?.id;
  const farmName = farm?.name;
  const farmLocation = farm?.location;
  const farmCounty = farm?.county;
  const farmSubCounty = farm?.subCounty;

  useEffect(() => {
    if (!farmId || !farm) {
      setState({ farmId: null, forecast: null, isLoading: false, error: null });
      return;
    }

    let active = true;
    setState((previous) => previous.farmId === farmId
      ? { ...previous, isLoading: true, error: null }
      : { farmId, forecast: null, isLoading: true, error: null });

    const shouldForceRefresh = forceRefresh.current;
    forceRefresh.current = false;
    getLiveWeatherForecast(farm, shouldForceRefresh)
      .then((forecast) => {
        if (active) setState({ farmId, forecast, isLoading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState((previous) => ({
            farmId,
            forecast: previous.farmId === farmId ? previous.forecast : null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Weather data is unavailable.',
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [farmId, farmName, farmLocation, farmCounty, farmSubCounty, refreshVersion]);

  const refresh = useCallback(() => {
    forceRefresh.current = true;
    setRefreshVersion((version) => version + 1);
  }, []);

  return { ...state, refresh };
};
