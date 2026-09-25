import type {
    CandlestickData,
    IChartApi,
    IPriceLine,
    ISeriesApi,
    LineData,
} from 'lightweight-charts';
import {
    CandlestickSeries,
    createChart,
    createSeriesMarkers,
    LineSeries,
    LineStyle,
} from 'lightweight-charts';
import { BarChart2, Loader2, TrendingUp, Wallet, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChartPointDto } from '../../../bindings/ChartPointDto';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import type { WatchlistItemDto } from '../../../bindings/WatchlistItemDto';
import type { WatchlistPositionDto } from '../../../bindings/WatchlistPositionDto';
import { Button } from '../../../shared/components/ui/button/Button';
import { cn } from '../../../shared/utils/twMerge';
import { fetchSymbolChart } from '../../Symbol/api/symbol';
import {
    buildChartOptions,
    buildTurningPointMarkers,
    CHART_RANGE_LABELS,
    CHART_RANGES,
    COMPARISON_COLORS,
    normalizeChartPoints,
    removeAllSeries,
    toChartTime,
    updatePrimarySeries,
} from '../lib/watchlistChart';
import type { ChartType, SymbolRange } from '../lib/watchlistChart';
import { ComparisonSearch } from './ComparisonSearch';

type Props = {
    items: WatchlistItemDto[];
    selectedSymbol: string;
    positions?: Record<string, WatchlistPositionDto>;
    quotes?: Record<string, QuoteDto>;
};

type ChartResult = {
    range: SymbolRange;
    points: ChartPointDto[];
    error: string | null;
};

const CHART_TYPES: { value: ChartType; labelKey: string; icon: ReactNode }[] = [
    {
        value: 'candlestick',
        labelKey: 'watchlist.trading_chart_type_candle',
        icon: <BarChart2 className="h-3.5 w-3.5" />,
    },
    {
        value: 'line',
        labelKey: 'watchlist.trading_chart_type_line',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
    },
    {
        value: 'line-markers',
        labelKey: 'watchlist.trading_chart_type_line_markers',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
    },
];

/**
 * Watchlist trading chart.
 *
 * Last-bar updates come from merged HTTP quotes + live `/api/stream` ticks.
 */
export function WatchlistTradingChart({
    items,
    selectedSymbol,
    positions = {},
    quotes = {},
}: Props) {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? 'fr';
    const symbols = useMemo(
        () => items.map((item) => item.instrument.symbol.toUpperCase()),
        [items],
    );
    const requestedPrimary = selectedSymbol.toUpperCase();
    const activeSymbol = symbols.includes(requestedPrimary)
        ? requestedPrimary
        : (symbols[0] ?? '');
    const [storedCompareSymbols, setCompareSymbols] = useState<string[]>([]);
    const [chartType, setChartType] = useState<ChartType>('candlestick');
    const [range, setRange] = useState<SymbolRange>('3mo');
    const [results, setResults] = useState<Record<string, ChartResult>>({});
    const [showPositionLine, setShowPositionLine] = useState(true);
    const compareSymbols = useMemo(
        () => storedCompareSymbols.filter((symbol) => symbol !== activeSymbol),
        [activeSymbol, storedCompareSymbols],
    );
    const displayedSymbols = useMemo(
        () => [activeSymbol, ...compareSymbols].filter(Boolean),
        [activeSymbol, compareSymbols],
    );
    const comparisonMode = compareSymbols.length > 0;
    const primaryResult = results[activeSymbol];
    const primaryFresh = primaryResult?.range === range;
    const loading = activeSymbol !== '' && !primaryFresh;
    const primaryPoints = useMemo(
        () => (primaryFresh ? primaryResult.points : []),
        [primaryFresh, primaryResult],
    );
    const error = primaryFresh ? primaryResult.error : null;
    const failedComparisons = compareSymbols.filter(
        (symbol) =>
            results[symbol]?.range === range && results[symbol]?.error !== null,
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<
        Map<string, ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>>
    >(new Map());
    const priceLineRef = useRef<IPriceLine | null>(null);
    const pointsRef = useRef<Record<string, ChartPointDto[]>>({});
    const chartTypeRef = useRef(chartType);
    const rangeRef = useRef(range);
    const comparisonModeRef = useRef(comparisonMode);

    useEffect(() => {
        chartTypeRef.current = chartType;
    }, [chartType]);
    useEffect(() => {
        rangeRef.current = range;
    }, [range]);
    useEffect(() => {
        comparisonModeRef.current = comparisonMode;
    }, [comparisonMode]);
    useEffect(() => {
        pointsRef.current = Object.fromEntries(
            Object.entries(results)
                .filter(([, result]) => result.range === range)
                .map(([symbol, result]) => [symbol, [...result.points]]),
        );
    }, [results, range]);

    const fetchChart = useCallback(
        async (
            symbol: string,
            selectedRange: SymbolRange,
        ): Promise<ChartResult> => {
            try {
                const payload = await fetchSymbolChart(symbol, selectedRange);
                return {
                    range: selectedRange,
                    points: payload.points ?? [],
                    error: null,
                };
            } catch {
                return {
                    range: selectedRange,
                    points: [],
                    error: t('watchlist.trading_chart_error'),
                };
            }
        },
        [t],
    );

    useEffect(() => {
        if (displayedSymbols.length === 0) {
            return;
        }
        let cancelled = false;
        void Promise.all(
            displayedSymbols.map(
                async (symbol) =>
                    [symbol, await fetchChart(symbol, range)] as const,
            ),
        ).then((entries) => {
            if (!cancelled) {
                setResults((current) => ({
                    ...current,
                    ...Object.fromEntries(entries),
                }));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [displayedSymbols, range, fetchChart]);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const chart = createChart(container, buildChartOptions(locale));
        const mountedSeries = seriesRefs.current;
        chartRef.current = chart;
        const themeObserver = new MutationObserver(() => {
            chart.applyOptions(buildChartOptions(locale));
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        let resizeFrame: number | null = null;
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry || entry.contentRect.width <= 0) {
                return;
            }
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(resizeFrame);
            }
            resizeFrame = window.requestAnimationFrame(() => {
                chart.timeScale().fitContent();
                resizeFrame = null;
            });
        });
        resizeObserver.observe(container);

        return () => {
            themeObserver.disconnect();
            resizeObserver.disconnect();
            if (resizeFrame !== null) {
                window.cancelAnimationFrame(resizeFrame);
            }
            chart.remove();
            chartRef.current = null;
            mountedSeries.clear();
        };
    }, [locale]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || loading || primaryPoints.length === 0) {
            return;
        }
        removeAllSeries(chart, seriesRefs.current);
        priceLineRef.current = null;

        if (comparisonMode) {
            displayedSymbols.forEach((symbol, index) => {
                const result = results[symbol];
                if (
                    !result ||
                    result.range !== range ||
                    result.points.length === 0
                ) {
                    return;
                }
                const series = chart.addSeries(LineSeries, {
                    color: COMPARISON_COLORS[index % COMPARISON_COLORS.length],
                    lineWidth: 2,
                    crosshairMarkerVisible: true,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    priceFormat: {
                        type: 'custom',
                        formatter: (value: number) =>
                            `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
                    },
                });
                series.setData(
                    normalizeChartPoints(result.points).map((point) => ({
                        time: toChartTime(point.time),
                        value: point.value,
                    })),
                );
                seriesRefs.current.set(symbol, series);
            });
        } else if (chartType === 'candlestick') {
            const series = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderUpColor: '#10b981',
                borderDownColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            const data: CandlestickData[] = primaryPoints
                .filter(
                    (point) =>
                        point.open !== null &&
                        point.high !== null &&
                        point.low !== null,
                )
                .map((point) => ({
                    time: toChartTime(point.date),
                    open: point.open as number,
                    high: point.high as number,
                    low: point.low as number,
                    close: point.close,
                }));
            series.setData(data);
            seriesRefs.current.set(activeSymbol, series);
        } else {
            const isUp =
                primaryPoints.length >= 2 &&
                primaryPoints[primaryPoints.length - 1].close >=
                    primaryPoints[0].close;
            const series = chart.addSeries(LineSeries, {
                color: isUp ? '#10b981' : '#ef4444',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                priceLineVisible: true,
            });
            const data: LineData[] = primaryPoints.map((point) => ({
                time: toChartTime(point.date),
                value: point.close,
            }));
            series.setData(data);
            if (chartType === 'line-markers') {
                createSeriesMarkers(
                    series,
                    buildTurningPointMarkers(primaryPoints, locale),
                );
            }
            seriesRefs.current.set(activeSymbol, series);
        }
        chart.timeScale().fitContent();
    }, [
        activeSymbol,
        chartType,
        comparisonMode,
        displayedSymbols,
        loading,
        locale,
        primaryPoints,
        range,
        results,
    ]);

    const position = positions[activeSymbol];

    useEffect(() => {
        const series = seriesRefs.current.get(activeSymbol);
        if (!series || comparisonMode) {
            return;
        }
        if (priceLineRef.current) {
            try {
                series.removePriceLine(priceLineRef.current);
            } catch {
                // The series was replaced.
            }
            priceLineRef.current = null;
        }
        if (!showPositionLine || !position || position.avg_price <= 0) {
            return;
        }
        priceLineRef.current = series.createPriceLine({
            price: position.avg_price,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: t('watchlist.trading_chart_position_line'),
        });
    }, [
        activeSymbol,
        chartType,
        comparisonMode,
        position,
        primaryPoints,
        showPositionLine,
        t,
    ]);

    const lastPrice = quotes[activeSymbol]?.regular_market_price ?? null;
    useEffect(() => {
        if (lastPrice === null || comparisonModeRef.current) {
            return;
        }
        const series = seriesRefs.current.get(activeSymbol);
        const points = pointsRef.current[activeSymbol];
        if (!series || !points || points.length === 0) {
            return;
        }
        updatePrimarySeries(
            series,
            points,
            lastPrice,
            chartTypeRef.current,
            rangeRef.current,
        );
    }, [activeSymbol, lastPrice]);

    const currency =
        items.find(
            (item) => item.instrument.symbol.toUpperCase() === activeSymbol,
        )?.instrument.currency ?? '';

    return (
        <section className="flex h-[calc(100dvh-8rem)] min-h-128 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 p-3 sm:p-4 xl:h-full xl:min-h-0 dark:border-white/10">
            <div className="mb-2 shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {t('watchlist.trading_chart_title')}
                        {!comparisonMode && currency && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-white/50">
                                {currency}
                            </span>
                        )}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <ComparisonSearch
                            excludedSymbols={displayedSymbols}
                            onAdd={(symbol) =>
                                setCompareSymbols((current) => [
                                    ...current,
                                    symbol,
                                ])
                            }
                        />
                        <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-mist-950/40">
                            {CHART_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setChartType(type.value)}
                                    disabled={comparisonMode}
                                    title={
                                        comparisonMode
                                            ? t(
                                                  'watchlist.comparison_line_only',
                                              )
                                            : t(type.labelKey)
                                    }
                                    className={cn(
                                        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                                        !comparisonMode &&
                                            chartType === type.value
                                            ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
                                            : 'text-gray-600 hover:cursor-pointer hover:text-gray-800 dark:text-white/50 dark:hover:text-white',
                                    )}
                                >
                                    {type.icon}
                                    <span className="hidden sm:inline">
                                        {t(type.labelKey)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {!comparisonMode &&
                            position &&
                            position.avg_price > 0 && (
                                <span
                                    title={t(
                                        'watchlist.trading_chart_position_toggle',
                                    )}
                                >
                                    <Button
                                        type="button"
                                        size="xs"
                                        variant={
                                            showPositionLine
                                                ? 'primary'
                                                : 'transparent'
                                        }
                                        className="h-7 gap-1 px-2 py-0 text-xs"
                                        onClick={() =>
                                            setShowPositionLine(
                                                (value) => !value,
                                            )
                                        }
                                    >
                                        <Wallet className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">
                                            {t(
                                                'watchlist.trading_chart_position_line',
                                            )}
                                        </span>
                                    </Button>
                                </span>
                            )}
                        <div className="flex flex-wrap items-center gap-0.5">
                            {CHART_RANGES.map((candidate) => (
                                <Button
                                    key={candidate}
                                    type="button"
                                    size="xs"
                                    variant={
                                        candidate === range
                                            ? 'primary'
                                            : 'transparent'
                                    }
                                    className="h-7 px-2 py-0 text-xs"
                                    onClick={() => setRange(candidate)}
                                    disabled={loading}
                                >
                                    {CHART_RANGE_LABELS[candidate]}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
                {comparisonMode && (
                    <div className="flex flex-wrap items-center gap-2">
                        {displayedSymbols.map((symbol, index) => (
                            <span
                                key={symbol}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                                    failedComparisons.includes(symbol)
                                        ? 'border-rose-400 text-rose-600'
                                        : 'border-gray-200 text-gray-700 dark:border-white/15 dark:text-white/80',
                                )}
                                style={{
                                    borderColor:
                                        COMPARISON_COLORS[
                                            index % COMPARISON_COLORS.length
                                        ],
                                }}
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                        backgroundColor:
                                            COMPARISON_COLORS[
                                                index % COMPARISON_COLORS.length
                                            ],
                                    }}
                                />
                                {symbol}
                                {symbol !== activeSymbol && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCompareSymbols((current) =>
                                                current.filter(
                                                    (candidate) =>
                                                        candidate !== symbol,
                                                ),
                                            )
                                        }
                                        aria-label={t(
                                            'watchlist.remove_comparison',
                                            { symbol },
                                        )}
                                        title={t(
                                            'watchlist.remove_comparison',
                                            { symbol },
                                        )}
                                        className="hover:cursor-pointer"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        <span className="text-xs text-gray-500 dark:text-white/50">
                            {t('watchlist.comparison_performance_hint')}
                        </span>
                    </div>
                )}
            </div>

            {loading && (
                <div className="flex min-h-96 flex-1 items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('watchlist.trading_chart_loading')}
                </div>
            )}
            {!loading && error && (
                <div className="flex min-h-96 flex-1 items-center justify-center text-sm text-rose-600">
                    {error}
                </div>
            )}
            {!loading && !error && primaryPoints.length === 0 && (
                <div className="flex min-h-96 flex-1 items-center justify-center text-sm text-gray-500 dark:text-white/50">
                    {t(
                        activeSymbol
                            ? 'watchlist.trading_chart_no_data'
                            : 'watchlist.no_symbol_chart',
                    )}
                </div>
            )}
            <div
                ref={containerRef}
                className={cn(
                    'min-h-0 w-full flex-1 overflow-hidden rounded-xl',
                    (loading || error || primaryPoints.length === 0) &&
                        'hidden',
                )}
            />
        </section>
    );
}
