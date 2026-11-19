import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Search,
  Check,
  Building,
  Phone,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Coins,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { Input } from '../../design-system/components/Input';
import {
  apiService,
  MarketCounty,
  MarketCommodity,
  MarketCommodityCategory,
  MarketCoverage,
  MarketDirectoryEntry,
  MarketOverview,
  MarketPriceComparisonGroup,
  MarketPriceObservation,
  MarketPriceTrend,
  MarketTradingUnit,
  MarketWatchItem,
  LivestockValuation,
} from '../../services/apiService';

const formatKes = (value: string | null) =>
  value === null
    ? null
    : `KES ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 }).format(Number(value))}`;

const formatObservationPrice = (observation: MarketPriceObservation) => {
  const minimum = formatKes(observation.minimum_price);
  const maximum = formatKes(observation.maximum_price);
  const average = formatKes(observation.average_price);
  const unit = `${observation.unit_quantity} ${observation.unit_name}`;

  if (minimum && maximum && minimum !== maximum) return `${minimum}–${maximum} per ${unit}`;
  if (average) return `${average} per ${unit}`;
  if (minimum) return `${minimum} per ${unit}`;
  return maximum ? `${maximum} per ${unit}` : 'Price not reported';
};

export const MarketplacePage: React.FC = () => {
  const { farmer, showToast } = useFarmer();
  const [priceSearch, setPriceSearch] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedCommodityKind, setSelectedCommodityKind] = useState<'all' | 'crop' | 'livestock'>('all');
  const [selectedPriceType, setSelectedPriceType] = useState<'all' | 'wholesale' | 'retail' | 'farm_gate' | 'other'>('all');
  const [selectedPriceUnit, setSelectedPriceUnit] = useState('all');
  const [marketCounties, setMarketCounties] = useState<MarketCounty[]>([]);
  const [marketDirectory, setMarketDirectory] = useState<MarketDirectoryEntry[]>([]);
  const [marketUnits, setMarketUnits] = useState<MarketTradingUnit[]>([]);
  const [priceObservations, setPriceObservations] = useState<MarketPriceObservation[]>([]);
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState('');
  const [priceRefreshVersion, setPriceRefreshVersion] = useState(0);
  const [countyError, setCountyError] = useState('');
  const [unitError, setUnitError] = useState('');
  const [marketCoverage, setMarketCoverage] = useState<MarketCoverage | null>(null);
  const [coverageError, setCoverageError] = useState('');
  const [lastPriceCheck, setLastPriceCheck] = useState<Date | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<number, MarketPriceObservation[]>>({});
  const [priceHistorySummary, setPriceHistorySummary] = useState<
    Record<number, MarketPriceTrend['summary']>
  >({});
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [trendDays, setTrendDays] = useState('30');
  const [trendStart, setTrendStart] = useState('');
  const [trendEnd, setTrendEnd] = useState('');
  const [catalogueKind, setCatalogueKind] = useState<'crop' | 'livestock'>('crop');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [catalogueCategory, setCatalogueCategory] = useState('all');
  const [catalogueCategories, setCatalogueCategories] = useState<MarketCommodityCategory[]>([]);
  const [catalogueItems, setCatalogueItems] = useState<MarketCommodity[]>([]);
  const [livestockCommodities, setLivestockCommodities] = useState<MarketCommodity[]>([]);
  const [catalogueCount, setCatalogueCount] = useState(0);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionAliases, setSuggestionAliases] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionPriceBasis, setSuggestionPriceBasis] = useState('');
  const [suggestionError, setSuggestionError] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [watchlist, setWatchlist] = useState<MarketWatchItem[]>([]);
  const [watchError, setWatchError] = useState('');
  const [comparisonCommodity, setComparisonCommodity] = useState('');
  const [comparisonMarkets, setComparisonMarkets] = useState<number[]>([]);
  const [comparisonStart, setComparisonStart] = useState('');
  const [comparisonEnd, setComparisonEnd] = useState('');
  const [comparisonResult, setComparisonResult] = useState<MarketPriceComparisonGroup[]>([]);
  const [comparisonError, setComparisonError] = useState('');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [valuationCommodity, setValuationCommodity] = useState('');
  const [valuationWeight, setValuationWeight] = useState('');
  const [valuationAnimalCount, setValuationAnimalCount] = useState('1');
  const [valuationBreed, setValuationBreed] = useState('');
  const [valuationAge, setValuationAge] = useState('');
  const [valuationResult, setValuationResult] = useState<LivestockValuation | null>(null);
  const [valuationError, setValuationError] = useState('');
  const [valuationLoading, setValuationLoading] = useState(false);


  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiService.getMarketCounties(controller.signal)
      .then((counties) => {
        if (active) {
          setMarketCounties(counties);
          setCountyError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setCountyError(error instanceof Error ? error.message : 'County options could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiService.getMarketTradingUnits(controller.signal)
      .then((units) => {
        if (active) setMarketUnits(units);
      })
      .catch((error: unknown) => {
        if (active) setUnitError(error instanceof Error ? error.message : 'Trading units could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiService.getMarketOverview(controller.signal)
      .then((overview) => {
        if (active) {
          setMarketOverview(overview);
          setMarketCoverage(overview.coverage);
          setCoverageError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setCoverageError(error instanceof Error ? error.message : 'Price coverage could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [priceRefreshVersion]);

  useEffect(() => {
    const profileCounty = marketCounties.find(
      (county) => county.name.toLocaleLowerCase() === farmer.county.trim().toLocaleLowerCase(),
    );
    if (profileCounty && selectedCounty === 'all') {
      setSelectedCounty(String(profileCounty.id));
    }
  }, [marketCounties, farmer.county, selectedCounty]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiService.getMarketWatchlist(controller.signal)
      .then((page) => {
        if (active) setWatchlist(page.results);
      })
      .catch((error: unknown) => {
        if (active) setWatchError(error instanceof Error ? error.message : 'Your market watchlist could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    apiService.getMarketCommodities('livestock', '', undefined, controller.signal)
      .then((page) => {
        if (active) setLivestockCommodities(page.results);
      })
      .catch(() => {
        if (active) setValuationError('Livestock catalogue is unavailable. Try again later.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (selectedCounty === 'all') {
      setMarketDirectory([]);
      return () => {
        active = false;
        controller.abort();
      };
    }

    apiService.getMarketMarkets(Number(selectedCounty), controller.signal)
      .then((page) => {
        if (active) {
          setMarketDirectory(page.results);
          setCountyError('');
        }
      })
      .catch((error: unknown) => {
        if (active) setCountyError(error instanceof Error ? error.message : 'Market options could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCounty]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCatalogueError('');
    apiService.getMarketCommodityCategories(catalogueKind, controller.signal)
      .then((categories) => {
        if (active) {
          setCatalogueCategories(categories);
          setSuggestionCategory((current) =>
            categories.some((category) => String(category.id) === current)
              ? current
              : String(categories[0]?.id ?? ''),
          );
          setCatalogueCategory('all');
        }
      })
      .catch((error: unknown) => {
        if (active) setCatalogueError(error instanceof Error ? error.message : 'Commodity categories could not be loaded.');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [catalogueKind]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setCatalogueLoading(true);
    setCatalogueError('');
    const timeoutId = window.setTimeout(() => {
      apiService.getMarketCommodities(
        catalogueKind,
        catalogueSearch,
        catalogueCategory === 'all' ? undefined : Number(catalogueCategory),
        controller.signal,
      )
        .then((page) => {
          if (active) {
            setCatalogueItems(page.results);
            setCatalogueCount(page.count);
          }
        })
        .catch((error: unknown) => {
          if (active) setCatalogueError(error instanceof Error ? error.message : 'Commodity catalogue could not be loaded.');
        })
        .finally(() => {
          if (active) setCatalogueLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [catalogueKind, catalogueSearch, catalogueCategory]);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const controller = new AbortController();
    setPriceObservations([]);
    setPriceLoading(true);
    setPriceError('');

    const refreshPrices = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const page = await apiService.getMarketPrices({
          search: priceSearch,
          county: selectedCounty === 'all' ? undefined : Number(selectedCounty),
          market: selectedMarket === 'all' ? undefined : Number(selectedMarket),
          kind: selectedCommodityKind === 'all' ? undefined : selectedCommodityKind,
          unit: selectedPriceUnit === 'all' ? undefined : Number(selectedPriceUnit),
          priceType: selectedPriceType === 'all' ? undefined : selectedPriceType,
        }, controller.signal);
        if (active) {
          setPriceObservations(page.results);
          setPriceError('');
          setLastPriceCheck(new Date());
        }
      } catch (error) {
        if (active) {
          setPriceError(error instanceof Error ? error.message : 'Market prices could not be refreshed.');
        }
      } finally {
        requestInFlight = false;
        if (active) setPriceLoading(false);
      }
    };

    void refreshPrices();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    priceSearch,
    selectedCounty,
    selectedMarket,
    selectedCommodityKind,
    selectedPriceUnit,
    selectedPriceType,
    priceRefreshVersion,
  ]);

  const handleCommoditySuggestionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuggestionError('');
    if (!suggestionCategory) {
      setSuggestionError('Select a category before submitting.');
      return;
    }

    setIsSuggesting(true);
    try {
      await apiService.suggestMarketCommodity({
        kind: catalogueKind,
        suggested_name: suggestionName.trim(),
        alternative_names: suggestionAliases
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean),
        category: Number(suggestionCategory),
        description: suggestionDescription.trim(),
        ...(catalogueKind === 'livestock' ? { price_basis: suggestionPriceBasis } : {}),
      });
      showToast('Suggestion submitted for review. It will not enter the catalogue until approved.');
      setIsSuggestionOpen(false);
      setSuggestionName('');
      setSuggestionAliases('');
      setSuggestionDescription('');
      setSuggestionPriceBasis('');
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'The suggestion could not be submitted.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleCommodityWatch = async (commodityId: number) => {
    setWatchError('');
    const saved = watchlist.find((item) => item.commodity === commodityId);
    try {
      if (saved) {
        await apiService.removeMarketWatch(saved.id);
        setWatchlist((current) => current.filter((item) => item.id !== saved.id));
      } else {
        const item = await apiService.addMarketWatch({ commodity: commodityId });
        setWatchlist((current) => [item, ...current]);
      }
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : 'The watchlist could not be updated.');
    }
  };

  const toggleCountyWatch = async () => {
    if (selectedCounty === 'all') return;
    const countyId = Number(selectedCounty);
    const saved = watchlist.find((item) => item.county === countyId);
    setWatchError('');
    try {
      if (saved) {
        await apiService.removeMarketWatch(saved.id);
        setWatchlist((current) => current.filter((item) => item.id !== saved.id));
      } else {
        const item = await apiService.addMarketWatch({ county: countyId });
        setWatchlist((current) => [item, ...current]);
      }
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : 'The watchlist could not be updated.');
    }
  };

  const toggleMarketWatch = async () => {
    if (selectedMarket === 'all') return;
    const marketId = Number(selectedMarket);
    const saved = watchlist.find((item) => item.market === marketId);
    setWatchError('');
    try {
      if (saved) {
        await apiService.removeMarketWatch(saved.id);
        setWatchlist((current) => current.filter((item) => item.id !== saved.id));
      } else {
        const item = await apiService.addMarketWatch({ market: marketId });
        setWatchlist((current) => [item, ...current]);
      }
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : 'The watchlist could not be updated.');
    }
  };

  const handleCompareMarkets = async (event: React.FormEvent) => {
    event.preventDefault();
    setComparisonError('');
    setComparisonResult([]);
    if (!comparisonCommodity || comparisonMarkets.length < 2 || selectedPriceType === 'all') {
      setComparisonError('Choose a crop, at least two markets, and one price classification.');
      return;
    }
    setComparisonLoading(true);
    try {
      const response = await apiService.compareMarketPrices({
        commodity: Number(comparisonCommodity),
        county: selectedCounty === 'all' ? undefined : Number(selectedCounty),
        markets: comparisonMarkets,
        price_type: selectedPriceType,
        observed_after: comparisonStart || undefined,
        observed_before: comparisonEnd || undefined,
      });
      setComparisonResult(response.groups);
      if (response.groups.length === 0) {
        setComparisonError('No comparable published prices were found for these markets, units, grades, and dates.');
      }
    } catch (error) {
      setComparisonError(error instanceof Error ? error.message : 'Market prices could not be compared.');
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleLivestockValuation = async (event: React.FormEvent) => {
    event.preventDefault();
    setValuationError('');
    setValuationResult(null);
    if (!valuationCommodity || selectedMarket === 'all' || selectedPriceType === 'all') {
      setValuationError('Choose a livestock category, market, and price classification.');
      return;
    }
    setValuationLoading(true);
    try {
      const selectedCommodity = livestockCommodities.find(
        (commodity) => commodity.id === Number(valuationCommodity),
      );
      if (!selectedCommodity) throw new Error('Select a livestock category from the catalogue.');
      const result = await apiService.getLivestockValuation({
        commodity: selectedCommodity.id,
        market: Number(selectedMarket),
        price_type: selectedPriceType,
        animal_count: Number(valuationAnimalCount),
        ...(selectedCommodity.price_basis === 'live_weight' ? { weight_kg: valuationWeight } : {}),
        ...(valuationBreed.trim() ? { breed: valuationBreed.trim() } : {}),
        ...(valuationAge.trim() ? { age_category: valuationAge.trim() } : {}),
      });
      setValuationResult(result);
    } catch (error) {
      setValuationError(error instanceof Error ? error.message : 'A valuation could not be calculated.');
    } finally {
      setValuationLoading(false);
    }
  };

  const togglePriceHistory = async (observationId: number) => {
    setHistoryError('');
    if (expandedHistoryId === observationId) {
      setExpandedHistoryId(null);
      return;
    }

    setExpandedHistoryId(observationId);
    if (priceHistory[observationId]) return;

    setHistoryLoadingId(observationId);
    try {
      const observation = priceObservations.find((item) => item.id === observationId);
      if (!observation) throw new Error('Price observation is no longer available.');
      const start = new Date();
      start.setDate(start.getDate() - Number(trendDays));
      if (trendDays === 'custom' && (!trendStart || !trendEnd || trendStart > trendEnd)) {
        throw new Error('Choose a valid custom date range before viewing history.');
      }
      const trend = await apiService.getMarketPriceTrend({
        commodity: observation.commodity,
        market: observation.market,
        unit: observation.unit,
        unitQuantity: observation.unit_quantity,
        priceType: observation.price_type,
        varietyGrade: observation.variety_grade,
        observedAfter: trendDays === 'custom' ? trendStart : start.toISOString().slice(0, 10),
        observedBefore: trendDays === 'custom' ? trendEnd : undefined,
      });
      setPriceHistory((current) => ({ ...current, [observationId]: trend.results }));
      setPriceHistorySummary((current) => ({ ...current, [observationId]: trend.summary }));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Price history could not be loaded.');
    } finally {
      setHistoryLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D]">
              Agricultural Market Intelligence
            </span>
            <span className="text-slate-300">·</span>
            <Badge variant="forest" size="sm">
              Published market data
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-[#16A34A]" />
            <span>Market Prices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse crop and livestock prices by county.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
          <Coins className="w-4 h-4 text-amber-600" />
          <span>Currency: Kenyan Shillings (KES)</span>
        </div>
      </div>

      {/* Scope Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-amber-900 leading-relaxed">Market prices come from published observations. Verify the source and date before making a sale decision.</span>
        </div>
      </div>

      {marketOverview && (
        <section className="grid grid-cols-2 xl:grid-cols-3 gap-3" aria-label="Market overview">
          {[
            { label: 'Crop categories', value: marketOverview.crop_categories },
            { label: 'Livestock categories', value: marketOverview.livestock_categories },
            { label: 'Counties with prices', value: `${marketOverview.coverage.counties_with_prices} / ${marketOverview.coverage.active_counties}` },
            { label: 'Markets with recent prices', value: `${marketOverview.coverage.markets_with_recent_prices} / ${marketOverview.coverage.active_markets}` },
            { label: 'Verified observations', value: marketOverview.coverage.verified_observations },
            { label: 'Estimated observations', value: marketOverview.coverage.estimated_observations },
          ].map((stat) => (
            <Card key={stat.label} padding="sm">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <p className="text-xl font-bold text-[#14532D] mt-1">{stat.value}</p>
            </Card>
          ))}
        </section>
      )}

      {marketOverview && marketOverview.latest_updates.length > 0 && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Latest published market updates</h2>
              <p className="text-xs text-slate-500">Each item keeps its source date and unit.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => document.getElementById('market-price-results')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore prices
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {marketOverview.latest_updates.map((observation) => (
              <button
                type="button"
                key={observation.id}
                onClick={() => {
                  setPriceSearch(observation.commodity_name);
                  setSelectedCounty(String(observation.county));
                  setSelectedMarket(String(observation.market));
                  document.getElementById('market-price-results')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="min-w-52 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-[#16A34A]"
              >
                <span className="block text-xs font-semibold text-slate-900">{observation.commodity_name}</span>
                <span className="block text-sm font-bold text-[#14532D] mt-1">{formatObservationPrice(observation)}</span>
                <span className="block text-[11px] text-slate-500 mt-1">
                  {observation.market_name}, {observation.county_name}
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  {observation.status} · {new Date(`${observation.observation_date}T00:00:00`).toLocaleDateString()}
                </span>
                {observation.source_reference && (
                  <span className="block text-[10px] text-slate-500 mt-1">
                    Source reference: {observation.source_reference}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">My market watchlist</h2>
            <p className="text-xs text-slate-500">Saved commodities and places for quick access; alerts are not sent.</p>
          </div>
          <span className="text-xs text-slate-500">{watchlist.length} saved</span>
        </div>
        {watchError && <p className="text-xs text-red-700" role="alert">{watchError}</p>}
        {watchlist.length === 0 ? (
          <p className="text-xs text-slate-500">Save a crop, livestock item, county, or market to follow it here.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {watchlist.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs text-green-950">
                {item.commodity_name ?? item.market_name ?? item.county_name}
                <button
                  type="button"
                  aria-label={`Remove ${item.commodity_name ?? item.market_name ?? item.county_name} from watchlist`}
                  onClick={async () => {
                    try {
                      await apiService.removeMarketWatch(item.id);
                      setWatchlist((current) => current.filter((watch) => watch.id !== item.id));
                    } catch (error) {
                      setWatchError(error instanceof Error ? error.message : 'The watchlist item could not be removed.');
                    }
                  }}
                  className="font-bold hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card id="market-price-results" padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Published market prices</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Observations load from the backend; refresh manually when needed. Refresh time is not the observation date.
            </p>
            {marketCoverage && (
              <p className="text-xs text-slate-500 mt-1">
                Observed coverage: {marketCoverage.counties_with_prices} of {marketCoverage.active_counties} counties
                {' · '}{marketCoverage.markets_with_recent_prices} of {marketCoverage.active_markets} markets with observations in the last 30 days
                {' · '}{marketCoverage.verified_observations} verified observations
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastPriceCheck && (
              <span className="text-[11px] text-slate-500">
                Last checked {lastPriceCheck.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPriceRefreshVersion((value) => value + 1)}
              disabled={priceLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${priceLoading ? 'animate-spin' : ''}`} />
              Refresh prices
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="relative">
            <span className="sr-only">Search published prices</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={priceSearch}
              onChange={(event) => setPriceSearch(event.target.value)}
              list="market-price-search-suggestions"
              placeholder="Search commodity, market, or source"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
            <datalist id="market-price-search-suggestions">
              {[...new Set([
                ...catalogueItems.map((item) => item.name),
                ...marketDirectory.map((market) => market.name),
                ...marketCounties.map((county) => county.name),
                ...priceObservations.map((observation) => observation.source_name),
              ])].map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </label>
          <label>
            <span className="sr-only">Filter prices by commodity type</span>
            <select
              value={selectedCommodityKind}
              onChange={(event) => {
                const value = event.target.value;
                if (value === 'crop' || value === 'livestock' || value === 'all') {
                  setSelectedCommodityKind(value);
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">Crops and livestock</option>
              <option value="crop">Crops</option>
              <option value="livestock">Livestock</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter prices by county</span>
            <select
              value={selectedCounty}
              onChange={(event) => {
                setSelectedCounty(event.target.value);
                setSelectedMarket('all');
                setComparisonMarkets([]);
                setComparisonResult([]);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">All counties</option>
              {marketCounties.map((county) => (
                <option key={county.id} value={county.id}>{county.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter prices by market</span>
            <select
              value={selectedMarket}
              onChange={(event) => setSelectedMarket(event.target.value)}
              disabled={selectedCounty === 'all'}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">
                {selectedCounty === 'all' ? 'Select county first' : 'All markets in county'}
              </option>
              {marketDirectory.map((market) => (
                <option key={market.id} value={market.id}>{market.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="sr-only">Filter prices by price type</span>
            <select
              value={selectedPriceType}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === 'all'
                  || value === 'wholesale'
                  || value === 'retail'
                  || value === 'farm_gate'
                  || value === 'other'
                ) {
                  setSelectedPriceType(value);
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">All price types</option>
              <option value="wholesale">Wholesale</option>
              <option value="retail">Retail</option>
              <option value="farm_gate">Farm gate</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter prices by trading unit</span>
            <select
              value={selectedPriceUnit}
              onChange={(event) => setSelectedPriceUnit(event.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">All trading units</option>
              {marketUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="w-full sm:w-56">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Price history range</span>
            <select
              value={trendDays}
              onChange={(event) => setTrendDays(event.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last 12 months</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>
          {trendDays === 'custom' && (
            <>
              <label className="flex-1">
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">From</span>
                <input type="date" value={trendStart} onChange={(event) => setTrendStart(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </label>
              <label className="flex-1">
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">To</span>
                <input type="date" value={trendEnd} onChange={(event) => setTrendEnd(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </label>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={selectedCounty === 'all'}
            onClick={() => void toggleCountyWatch()}
          >
            {watchlist.some((item) => item.county === Number(selectedCounty)) ? 'Remove county from watchlist' : 'Watch this county'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={selectedMarket === 'all'}
            onClick={() => void toggleMarketWatch()}
          >
            {watchlist.some((item) => item.market === Number(selectedMarket)) ? 'Remove market from watchlist' : 'Watch this market'}
          </Button>
        </div>

        {countyError && <p className="text-xs text-amber-800" role="status">{countyError}</p>}
        {unitError && <p className="text-xs text-amber-800" role="status">{unitError}</p>}
        {coverageError && <p className="text-xs text-amber-800" role="status">{coverageError}</p>}
        {priceError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
            Prices could not be refreshed: {priceError}
          </p>
        )}

        {priceLoading && priceObservations.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Loading published prices…</p>
        ) : priceObservations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="font-semibold text-slate-800">
              No verified market price is currently available for this commodity and market.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              No published observation matches these filters. Unverified reports are not shown.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {priceObservations.map((observation) => {
              const freshnessVariant = observation.freshness === 'fresh'
                ? 'success'
                : observation.freshness === 'recent'
                  ? 'info'
                  : observation.freshness === 'aging'
                    ? 'warning'
                    : 'neutral';
              return (
                <article key={observation.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        {observation.commodity_category} · {observation.commodity_kind}
                      </p>
                      <h3 className="font-bold text-slate-900 mt-1">{observation.commodity_name}</h3>
                    </div>
                    <Badge variant={observation.status === 'verified' ? 'forest' : 'harvest'} size="sm">
                      {observation.status}
                    </Badge>
                  </div>
                  {observation.variety_grade && (
                    <p className="text-xs text-slate-500 mt-1">{observation.variety_grade}</p>
                  )}
                  {observation.livestock_breed && (
                    <p className="text-xs text-slate-500 mt-1">Breed: {observation.livestock_breed}</p>
                  )}
                  <p className="font-mono font-bold text-[#14532D] text-sm mt-3">
                    {formatObservationPrice(observation)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Badge variant={freshnessVariant} size="sm">{observation.freshness}</Badge>
                    <Badge variant="neutral" size="sm">{observation.price_type.replace('_', ' ')}</Badge>
                  </div>
                  {observation.freshness === 'stale' && (
                    <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">
                      Historical observation only. This stale price should not be treated as current.
                    </p>
                  )}
                  <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5 text-[11px] text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {observation.market_name}, {observation.county_name}
                    </p>
                    <p>
                      Observed {new Date(`${observation.observation_date}T00:00:00`).toLocaleDateString()}
                      {' · '}{observation.age_days} days ago
                    </p>
                    <p>
                      Source:{' '}
                      {observation.source_url ? (
                        <a href={observation.source_url} target="_blank" rel="noreferrer" className="font-medium text-[#14532D] underline">
                          {observation.source_name}
                        </a>
                      ) : observation.source_name}
                    </p>
                    {observation.livestock_price_basis && (
                      <p>Livestock basis: {observation.livestock_price_basis.replaceAll('_', ' ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void togglePriceHistory(observation.id)}
                    aria-expanded={expandedHistoryId === observation.id}
                    className="mt-3 text-xs font-semibold text-[#14532D] hover:underline"
                  >
                    {expandedHistoryId === observation.id ? 'Hide price history' : 'View price history'}
                  </button>
                  {expandedHistoryId === observation.id && (
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      {historyLoadingId === observation.id ? (
                        <p className="text-xs text-slate-500">Loading price history…</p>
                      ) : historyError ? (
                        <p className="text-xs text-red-700" role="alert">{historyError}</p>
                      ) : (
                        <>
                          {(() => {
                            const points = (priceHistory[observation.id] ?? [])
                              .filter((point) => point.average_price !== null);
                            const numbers = points.map((point) => Number(point.average_price));
                            const minimum = numbers.length ? Math.min(...numbers) : 0;
                            const maximum = numbers.length ? Math.max(...numbers) : 0;
                            const spread = maximum - minimum || 1;
                            return points.length > 0 ? (
                              <>
                                <p className="text-[11px] text-slate-600">
                                  {priceHistorySummary[observation.id]?.observation_count ?? points.length} observations
                                  {' · '}Average {formatKes(priceHistorySummary[observation.id]?.period_average ?? null)}
                                  {priceHistorySummary[observation.id]?.percentage_change_first_to_last !== null
                                    && priceHistorySummary[observation.id]?.percentage_change_first_to_last !== undefined
                                    ? ` · ${priceHistorySummary[observation.id].percentage_change_first_to_last}% change from ${priceHistorySummary[observation.id].comparison_period.first_observation_date} to ${priceHistorySummary[observation.id].comparison_period.last_observation_date}`
                                    : ''}
                                </p>
                                {points.length >= 2 ? (
                                  <svg viewBox="0 0 300 110" role="img" aria-label={`${observation.commodity_name} observed average prices over time`} className="w-full h-28 mt-2">
                                    <line x1="20" y1="8" x2="20" y2="90" stroke="#cbd5e1" />
                                    <line x1="20" y1="90" x2="292" y2="90" stroke="#cbd5e1" />
                                    {points.map((point, index) => {
                                      const x = points.length === 1 ? 156 : 24 + (index * 264) / (points.length - 1);
                                      const y = 84 - ((Number(point.average_price) - minimum) / spread) * 68;
                                      return (
                                        <circle key={point.id} cx={x} cy={y} r="3.5" fill="#16A34A">
                                          <title>{`${point.observation_date}: ${formatObservationPrice(point)}`}</title>
                                        </circle>
                                      );
                                    })}
                                  </svg>
                                ) : (
                                  <p className="text-xs text-slate-500 mt-2">Only one comparable observation is available; no trend can be shown.</p>
                                )}
                                <ul className="space-y-1 text-[11px] text-slate-600">
                                  {points.slice(-5).reverse().map((historical) => (
                                    <li key={historical.id} className="flex justify-between gap-2">
                                      <span>{new Date(`${historical.observation_date}T00:00:00`).toLocaleDateString()} · {historical.market_name}</span>
                                      <span className="font-medium">{formatObservationPrice(historical)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500 mt-2">No historical observations are available for this exact unit, quantity, grade and price type.</p>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="md" className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Compare crop markets</h2>
          <p className="text-xs text-slate-500 mt-1">
            Compares each market’s latest published observation in the selected date range. Different units, package sizes and grades stay separate.
          </p>
        </div>
        <form onSubmit={handleCompareMarkets} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Crop with published observations</span>
            <select
              value={comparisonCommodity}
              onChange={(event) => setComparisonCommodity(event.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="">Select a crop</option>
              {Array.from(new Map(
                priceObservations
                  .filter((observation) => observation.commodity_kind === 'crop')
                  .map((observation) => [observation.commodity, observation.commodity_name]),
              ).entries()).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Markets in {marketCounties.find((county) => String(county.id) === selectedCounty)?.name ?? 'the selected county'}
            </span>
            {marketDirectory.length === 0 ? (
              <p className="text-xs text-slate-500">Choose a county with configured markets to compare prices.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {marketDirectory.map((market) => (
                  <label key={market.id} className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={comparisonMarkets.includes(market.id)}
                      onChange={(event) => setComparisonMarkets((current) =>
                        event.target.checked
                          ? [...current, market.id]
                          : current.filter((id) => id !== market.id),
                      )}
                    />
                    {market.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">From date (optional)</span>
              <input type="date" value={comparisonStart} onChange={(event) => setComparisonStart(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </label>
            <label>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">To date (optional)</span>
              <input type="date" value={comparisonEnd} onChange={(event) => setComparisonEnd(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </label>
          </div>
          <Button type="submit" variant="forest" size="sm" isLoading={comparisonLoading}>
            Compare selected markets
          </Button>
        </form>
        {comparisonError && (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3" role="status">
            {comparisonError}
          </p>
        )}
        {comparisonResult.map((group, index) => (
          <div key={`${group.unit}-${group.unit_quantity}-${group.variety_grade}-${index}`} className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-xs">
              <caption className="text-left font-semibold text-slate-800 p-3">
                Comparable unit: {group.unit_quantity} {group.unit_name}
                {group.variety_grade ? ` · ${group.variety_grade}` : ''}
              </caption>
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="p-3">Market</th><th className="p-3">Reported average</th><th className="p-3">Observation date</th><th className="p-3">Source</th></tr>
              </thead>
              <tbody>
                {group.observations.map((observation) => (
                  <tr key={observation.id} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{observation.market_name}, {observation.county_name}</td>
                    <td className="p-3">{formatObservationPrice(observation)}</td>
                    <td className="p-3">{new Date(`${observation.observation_date}T00:00:00`).toLocaleDateString()}</td>
                    <td className="p-3">{observation.source_name} · {observation.status}</td>
                  </tr>
                ))}
              </tbody>
              {group.difference_between_market_averages && (
                <tfoot className="bg-green-50">
                  <tr><td className="p-3 font-semibold" colSpan={4}>
                    Difference in latest market averages: {formatKes(group.difference_between_market_averages)} per {group.unit_quantity} {group.unit_name}
                  </td></tr>
                </tfoot>
              )}
            </table>
          </div>
        ))}
      </Card>

      <Card padding="md" className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Indicative livestock valuation</h2>
          <p className="text-xs text-slate-500 mt-1">Uses fresh, verified prices for the selected market and the catalogue’s stated price basis only.</p>
        </div>
        <form onSubmit={handleLivestockValuation} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Livestock category or product</span>
            <select
              value={valuationCommodity}
              onChange={(event) => setValuationCommodity(event.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="">Select livestock</option>
              {livestockCommodities.map((commodity) => (
                <option key={commodity.id} value={commodity.id}>{commodity.name} · {commodity.price_basis.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Animals or products counted</span>
            <input type="number" min="1" max="100" step="1" value={valuationAnimalCount} onChange={(event) => setValuationAnimalCount(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
          </label>
          {livestockCommodities.find((commodity) => commodity.id === Number(valuationCommodity))?.price_basis === 'live_weight' && (
            <label>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">Live weight per animal (kg)</span>
              <input type="number" min="0.01" step="0.01" value={valuationWeight} onChange={(event) => setValuationWeight(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </label>
          )}
          <label>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Breed (optional; match source spelling)</span>
            <input value={valuationBreed} onChange={(event) => setValuationBreed(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Age category (optional; match source spelling)</span>
            <input value={valuationAge} onChange={(event) => setValuationAge(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="forest" size="sm" isLoading={valuationLoading}>
              Calculate indicative value
            </Button>
          </div>
        </form>
        {valuationError && <p className="text-xs text-red-700" role="alert">{valuationError}</p>}
        {valuationResult && (
          <div className={`rounded-xl border p-4 ${valuationResult.available ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`} role="status">
            <p className="font-semibold text-slate-900">{valuationResult.message}</p>
            {valuationResult.available ? (
              <>
                <p className="text-lg font-bold text-[#14532D] mt-2">
                  {formatKes(valuationResult.minimum_value ?? null)}
                  {' – '}
                  {formatKes(valuationResult.maximum_value ?? null)}
                  {valuationResult.average_value && ` · midpoint average ${formatKes(valuationResult.average_value)}`}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  {valuationResult.commodity_name} · {valuationResult.market_name}, {valuationResult.county_name}
                  {' · '}{valuationResult.price_basis.replaceAll('_', ' ')}
                  {' · '}{valuationResult.status} · {valuationResult.freshness}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Observed {valuationResult.observation_date} · Source: {valuationResult.source_name}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-600 mt-1">No compatible fresh verified observation was found. No value has been estimated.</p>
            )}
            <p className="text-[11px] text-slate-500 mt-2">Indicative market valuation - actual selling prices may vary. Not a guaranteed selling price.</p>
          </div>
        )}
      </Card>

      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Crop and livestock catalogue</h2>
            <p className="text-xs text-slate-500 mt-1">
              Search approved commodities and propose an unlisted item for review.
            </p>
          </div>
          <Button
            variant="forest"
            size="sm"
            onClick={() => {
              setSuggestionError('');
              setIsSuggestionOpen(true);
            }}
          >
            Suggest missing item
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label>
            <span className="sr-only">Choose crop or livestock catalogue</span>
            <select
              value={catalogueKind}
              onChange={(event) => {
                if (event.target.value === 'crop' || event.target.value === 'livestock') {
                  setCatalogueKind(event.target.value);
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="crop">Crops</option>
              <option value="livestock">Livestock and animal products</option>
            </select>
          </label>
          <label className="relative sm:col-span-2">
            <span className="sr-only">Search commodity catalogue</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={catalogueSearch}
              onChange={(event) => setCatalogueSearch(event.target.value)}
              placeholder="Search common or local commodity names"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </label>
          <label className="sm:col-span-3">
            <span className="sr-only">Filter catalogue by category</span>
            <select
              value={catalogueCategory}
              onChange={(event) => setCatalogueCategory(event.target.value)}
              className="w-full sm:w-auto min-w-56 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="all">All {catalogueKind === 'crop' ? 'crop' : 'livestock'} categories</option>
              {catalogueCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>

        {catalogueError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3" role="alert">
            Catalogue could not be loaded: {catalogueError}
          </p>
        )}
        {catalogueLoading ? (
          <p className="text-sm text-slate-500 py-4">Loading catalogue…</p>
        ) : catalogueItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
            <p className="font-semibold text-slate-800">No catalogue items match this search.</p>
            <p className="text-xs text-slate-500 mt-1">You can suggest an unlisted item for review.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {catalogueItems.map((commodity) => (
                <article key={commodity.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{commodity.category_name}</p>
                    <button
                      type="button"
                      onClick={() => void toggleCommodityWatch(commodity.id)}
                      aria-pressed={watchlist.some((item) => item.commodity === commodity.id)}
                      className="text-[11px] font-semibold text-[#14532D] hover:underline"
                    >
                      {watchlist.some((item) => item.commodity === commodity.id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-1">{commodity.name}</h3>
                  {commodity.scientific_name && (
                    <p className="text-xs italic text-slate-500 mt-1">{commodity.scientific_name}</p>
                  )}
                  {commodity.alternative_names.length > 0 && (
                    <p className="text-xs text-slate-600 mt-2">
                      Also known as: {commodity.alternative_names.join(', ')}
                    </p>
                  )}
                  {commodity.description && (
                    <p className="text-xs text-slate-600 mt-2">{commodity.description}</p>
                  )}
                  {commodity.price_basis && (
                    <Badge variant="info" size="sm" className="mt-3">
                      {commodity.price_basis.replaceAll('_', ' ')}
                    </Badge>
                  )}
                </article>
              ))}
            </div>
            {catalogueCount > catalogueItems.length && (
              <p className="text-[11px] text-slate-500">
                Showing {catalogueItems.length} of {catalogueCount} items. Search or choose a category to narrow the list.
              </p>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={isSuggestionOpen}
        onClose={() => setIsSuggestionOpen(false)}
        title={`Suggest a missing ${catalogueKind === 'crop' ? 'crop' : 'livestock item'}`}
        description="Suggestions are reviewed before they can appear in the approved catalogue."
        primaryAction={{
          label: 'Submit for review',
          variant: 'forest',
          onClick: () => document.getElementById('commodity-suggestion-submit')?.click(),
          isLoading: isSuggesting,
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsSuggestionOpen(false),
        }}
      >
        <form onSubmit={handleCommoditySuggestionSubmit} className="space-y-4">
          <Input
            label="Commodity name"
            value={suggestionName}
            onChange={(event) => setSuggestionName(event.target.value)}
            maxLength={150}
            required
          />
          <Input
            label="Alternative or local names"
            value={suggestionAliases}
            onChange={(event) => setSuggestionAliases(event.target.value)}
            helperText="Separate names with commas."
          />
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Category</span>
            <select
              value={suggestionCategory}
              onChange={(event) => setSuggestionCategory(event.target.value)}
              required
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            >
              <option value="">Choose a category</option>
              {catalogueCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          {catalogueKind === 'livestock' && (
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">Price basis</span>
              <select
                value={suggestionPriceBasis}
                onChange={(event) => setSuggestionPriceBasis(event.target.value)}
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
              >
                <option value="">Choose a price basis</option>
                <option value="per_animal">Per live animal</option>
                <option value="live_weight">Per kilogram live weight</option>
                <option value="carcass_weight">Per kilogram carcass weight</option>
                <option value="meat_weight">Per kilogram meat</option>
                <option value="milk_volume">Per litre of milk</option>
                <option value="egg_count">Per egg</option>
                <option value="honey_weight">Per kilogram of honey</option>
                <option value="other">Other stated basis</option>
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">Description (optional)</span>
            <textarea
              value={suggestionDescription}
              onChange={(event) => setSuggestionDescription(event.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </label>
          {suggestionError && <p className="text-xs text-red-700" role="alert">{suggestionError}</p>}
          <button type="submit" id="commodity-suggestion-submit" className="hidden" />
        </form>
      </Modal>

      <section aria-labelledby="market-bids-heading">
        <Card padding="md" className="flex items-start gap-3 border-dashed">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#14532D]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 id="market-bids-heading" className="font-bold text-slate-900">Buyer bids</h2>
            <p className="mt-1 text-sm text-slate-600">No verified buyer bids are available yet.</p>
          </div>
        </Card>
      </section>
    </div>
  );
};
