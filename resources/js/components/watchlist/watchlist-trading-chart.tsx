import type {
    BusinessDay,
    CandlestickData,
    ChartOptions,
    DeepPartial,
    IChartApi,
    IPriceLine,
    ISeriesApi,
    LineData,
    SeriesMarker,
    Time,
    UTCTimestamp,
} from 'lightweight-charts';
import {
    CandlestickSeries,
    ColorType,
    createChart,
    createSeriesMarkers,
    LineSeries,
    LineStyle,
    TickMarkType,
} from 'lightweight-charts';
import {
    BarChart2,
    Loader2,
    Plus,
    Search,
    TrendingUp,
    Wallet,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useFinanceQueryStream } from '@/hooks/use-finance-query-stream';
import { apiFetch } from '@/lib/api';
import { CHART_RANGE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { normalizeChartPoints } from '@/lib/watchlist';
import type {
    ChartPoint,
    SymbolRange,
    SymbolSearchResult,
} from '@/types/symbol';
import type {
    PriceUpdate,
    WatchlistItem,
    WatchlistPosition,
} from '@/types/watchlist';

type ChartType = 'candlestick' | 'line' | 'line-markers';

type Props = {
    items: WatchlistItem[];
    wsUrl: string;
    positions?: Record<string, WatchlistPosition>;
    selectedSymbol: string;
};

type ChartResult = {
    range: SymbolRange;
    points: ChartPoint[];
    error: string | null;
};

const RANGES: SymbolRange[] = [
    '1d',
    '5d',
    '1mo',
    '3mo',
    '6mo',
    '1y',
    '2y',
    '5y',
];

const INTERVAL_SECONDS: Record<SymbolRange, number> = {
    '1d': 5 * 60,
    '5d': 15 * 60,
    '1mo': 24 * 60 * 60,
    '3mo': 24 * 60 * 60,
    '6mo': 24 * 60 * 60,
    '1y': 24 * 60 * 60,
    '2y': 7 * 24 * 60 * 60,
    '5y': 7 * 24 * 60 * 60,
    '10y': 30 * 24 * 60 * 60,
    ytd: 24 * 60 * 60,
};

const COMPARISON_COLORS = [
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
];

const CHART_TYPES: {
    value: ChartType;
    labelKey: string;
    icon: React.ReactNode;
}[] = [
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

export function WatchlistTradingChart({
    items,
    wsUrl,
    positions = {},
    selectedSymbol,
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
    const pointsRef = useRef<Record<string, ChartPoint[]>>({});
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
        async (symbol: string, selectedRange: SymbolRange) => {
            try {
                const response = await fetch(
                    `/symbol/${encodeURIComponent(symbol)}/chart?range=${encodeURIComponent(selectedRange)}`,
                    { headers: { Accept: 'application/json' } },
                );

                if (!response.ok) {
                    throw new Error('fetch error');
                }

                const payload = (await response.json()) as {
                    points?: ChartPoint[];
                };

                return {
                    range: selectedRange,
                    points: payload.points ?? [],
                    error: null,
                } satisfies ChartResult;
            } catch {
                return {
                    range: selectedRange,
                    points: [],
                    error: t('watchlist.trading_chart_error'),
                } satisfies ChartResult;
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
            if (cancelled) {
                return;
            }

            setResults((current) => ({
                ...current,
                ...Object.fromEntries(entries),
            }));
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

    const handleLiveUpdate = useCallback(
        (update: PriceUpdate) => {
            const symbol = update.id.toUpperCase();
            const series = seriesRefs.current.get(symbol);
            const points = pointsRef.current[symbol];

            if (!series || !points || points.length === 0) {
                return;
            }

            const last = points[points.length - 1];

            if (comparisonModeRef.current) {
                const baseline = points[0]?.close;

                if (!baseline) {
                    return;
                }

                (series as ISeriesApi<'Line'>).update({
                    time: liveChartTime(last, rangeRef.current),
                    value: ((update.price - baseline) / baseline) * 100,
                });

                return;
            }

            if (symbol !== activeSymbol) {
                return;
            }

            updatePrimarySeries(
                series,
                points,
                update.price,
                chartTypeRef.current,
                rangeRef.current,
            );
        },
        [activeSymbol],
    );

    useFinanceQueryStream({
        symbols: displayedSymbols,
        wsUrl,
        onUpdate: handleLiveUpdate,
        enabled: displayedSymbols.length > 0 && wsUrl !== '',
    });

    const currency =
        items.find(
            (item) => item.instrument.symbol.toUpperCase() === activeSymbol,
        )?.instrument.currency ?? '';

    return (
        <Card className="h-[calc(100dvh-8rem)] min-h-[32rem] min-w-0 py-6 2xl:h-full 2xl:min-h-0">
            <CardHeader className="shrink-0 space-y-3 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">
                        {t('watchlist.trading_chart_title')}
                        {!comparisonMode && currency && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {currency}
                            </span>
                        )}
                    </CardTitle>

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

                        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
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
                                            : t(
                                                  type.labelKey as Parameters<
                                                      typeof t
                                                  >[0],
                                              )
                                    }
                                    className={cn(
                                        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                                        !comparisonMode &&
                                            chartType === type.value
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {type.icon}
                                    <span className="hidden sm:inline">
                                        {t(
                                            type.labelKey as Parameters<
                                                typeof t
                                            >[0],
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {!comparisonMode &&
                            position &&
                            position.avg_price > 0 && (
                                <Button
                                    type="button"
                                    variant={
                                        showPositionLine ? 'default' : 'ghost'
                                    }
                                    size="sm"
                                    className="h-7 gap-1 px-2 text-xs"
                                    title={t(
                                        'watchlist.trading_chart_position_toggle',
                                    )}
                                    onClick={() =>
                                        setShowPositionLine((value) => !value)
                                    }
                                >
                                    <Wallet className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">
                                        {t(
                                            'watchlist.trading_chart_position_line',
                                        )}
                                    </span>
                                </Button>
                            )}

                        <div className="flex items-center gap-0.5">
                            {RANGES.map((candidate) => (
                                <Button
                                    key={candidate}
                                    type="button"
                                    variant={
                                        candidate === range
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className="h-7 px-2 text-xs"
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
                            <Badge
                                key={symbol}
                                variant="outline"
                                className={cn(
                                    'gap-1',
                                    failedComparisons.includes(symbol) &&
                                        'border-destructive text-destructive',
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
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </Badge>
                        ))}
                        <span className="text-xs text-muted-foreground">
                            {t('watchlist.comparison_performance_hint')}
                        </span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col p-0 pt-2">
                {loading && (
                    <div className="flex min-h-96 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('watchlist.trading_chart_loading')}
                    </div>
                )}
                {!loading && error && (
                    <div className="flex min-h-96 flex-1 items-center justify-center text-sm text-destructive">
                        {error}
                    </div>
                )}
                {!loading && !error && primaryPoints.length === 0 && (
                    <div className="flex min-h-96 flex-1 items-center justify-center text-sm text-muted-foreground">
                        {t('watchlist.trading_chart_no_data')}
                    </div>
                )}
                <div
                    ref={containerRef}
                    className={cn(
                        'min-h-96 w-full flex-1 overflow-hidden rounded-b-xl',
                        (loading || error || primaryPoints.length === 0) &&
                            'hidden',
                    )}
                />
            </CardContent>
        </Card>
    );
}

function ComparisonSearch({
    excludedSymbols,
    onAdd,
}: {
    excludedSymbols: string[];
    onAdd: (symbol: string) => void;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SymbolSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const trimmed = query.trim();

        if (!open || trimmed.length < 2) {
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setLoading(true);

            try {
                const payload = await apiFetch<{
                    data?: SymbolSearchResult[];
                }>(`/symbol-search?q=${encodeURIComponent(trimmed)}`, {
                    signal: controller.signal,
                });
                setResults(
                    (payload.data ?? []).filter(
                        (result) =>
                            !excludedSymbols.includes(
                                result.symbol.toUpperCase(),
                            ),
                    ),
                );
            } catch {
                if (!controller.signal.aborted) {
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [excludedSymbols, open, query]);

    const add = (symbol: string) => {
        onAdd(symbol.toUpperCase());
        setQuery('');
        setResults([]);
        setOpen(false);
    };

    return (
        <div className="relative">
            {open ? (
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1.5 left-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onBlur={() =>
                            window.setTimeout(() => setOpen(false), 150)
                        }
                        className="h-7 w-48 pr-7 pl-7 text-xs"
                        placeholder={t('watchlist.compare_placeholder')}
                        autoFocus
                    />
                    {loading && (
                        <Loader2 className="absolute top-1.5 right-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {query.trim().length >= 2 && results.length > 0 && (
                        <div className="absolute top-8 left-0 z-50 max-h-64 w-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                            {results.map((result) => (
                                <button
                                    key={`${result.symbol}-${result.exchange}`}
                                    type="button"
                                    onMouseDown={(event) =>
                                        event.preventDefault()
                                    }
                                    onClick={() => add(result.symbol)}
                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
                                >
                                    <span>
                                        <strong>{result.symbol}</strong>
                                        {result.name && (
                                            <span className="ml-2 text-muted-foreground">
                                                {result.name}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {result.exchange}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setOpen(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t('watchlist.compare_btn')}
                </Button>
            )}
        </div>
    );
}

function buildChartOptions(locale: string): DeepPartial<ChartOptions> {
    const text = cssColor('--muted-foreground');
    const grid = cssColor('--border');
    const labelBackground = cssColor('--secondary');

    return {
        autoSize: true,
        layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: text,
            fontFamily: 'inherit',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: grid },
            horzLines: { color: grid },
        },
        crosshair: {
            vertLine: {
                color: grid,
                labelBackgroundColor: labelBackground,
            },
            horzLine: {
                color: grid,
                labelBackgroundColor: labelBackground,
            },
        },
        rightPriceScale: { borderColor: grid },
        timeScale: {
            borderColor: grid,
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 4,
            tickMarkFormatter: (
                time: UTCTimestamp | BusinessDay,
                tickMarkType: TickMarkType,
            ) => formatTick(time, tickMarkType, locale),
        },
        handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
        },
        handleScale: {
            mouseWheel: true,
            pinch: true,
            axisPressedMouseMove: { time: true, price: true },
        },
        localization: {
            locale,
            timeFormatter: (time: BusinessDay | UTCTimestamp) =>
                formatTime(time, locale),
        },
    };
}

function removeAllSeries(
    chart: IChartApi,
    series: Map<string, ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>>,
) {
    for (const current of series.values()) {
        try {
            chart.removeSeries(current);
        } catch {
            // Already removed during a chart refresh.
        }
    }

    series.clear();
}

function updatePrimarySeries(
    series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>,
    points: ChartPoint[],
    price: number,
    chartType: ChartType,
    range: SymbolRange,
) {
    const last = points[points.length - 1];
    const isIntraday = /^\d+$/.test(last.date);

    if (!isIntraday) {
        if (chartType === 'candlestick') {
            const high = Math.max(last.high ?? price, price);
            const low = Math.min(last.low ?? price, price);
            (series as ISeriesApi<'Candlestick'>).update({
                time: last.date as Time,
                open: last.open ?? price,
                high,
                low,
                close: price,
            });
            points[points.length - 1] = { ...last, high, low, close: price };
        } else {
            (series as ISeriesApi<'Line'>).update({
                time: last.date as Time,
                value: price,
            });
            points[points.length - 1] = { ...last, close: price };
        }

        return;
    }

    const interval = INTERVAL_SECONDS[range];
    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / interval) * interval;
    const lastTime = Number(last.date);
    const isNewBucket = bucket > lastTime;
    const time = (isNewBucket ? bucket : lastTime) as UTCTimestamp;

    if (chartType === 'candlestick') {
        const high = isNewBucket ? price : Math.max(last.high ?? price, price);
        const low = isNewBucket ? price : Math.min(last.low ?? price, price);
        (series as ISeriesApi<'Candlestick'>).update({
            time,
            open: isNewBucket ? price : (last.open ?? price),
            high,
            low,
            close: price,
        });
        const next = {
            ...last,
            date: String(time),
            open: isNewBucket ? price : last.open,
            high,
            low,
            close: price,
        };

        if (isNewBucket) {
            points.push(next);
        } else {
            points[points.length - 1] = next;
        }
    } else {
        (series as ISeriesApi<'Line'>).update({ time, value: price });
        const next = { ...last, date: String(time), close: price };

        if (isNewBucket) {
            points.push(next);
        } else {
            points[points.length - 1] = next;
        }
    }
}

function liveChartTime(last: ChartPoint, range: SymbolRange): Time {
    if (!/^\d+$/.test(last.date)) {
        return last.date as Time;
    }

    const interval = INTERVAL_SECONDS[range];
    const now = Math.floor(Date.now() / 1000);

    return (Math.floor(now / interval) * interval) as UTCTimestamp;
}

function buildTurningPointMarkers(
    points: ChartPoint[],
    locale: string,
): SeriesMarker<Time>[] {
    const markers: SeriesMarker<Time>[] = [];

    for (let index = 1; index < points.length - 1; index++) {
        const previous = points[index - 1].close;
        const current = points[index].close;
        const next = points[index + 1].close;

        if (current > previous && current > next) {
            markers.push({
                time: toChartTime(points[index].date),
                position: 'aboveBar',
                color: '#10b981',
                shape: 'arrowDown',
                size: 0.8,
                text: formatValue(current, locale),
            });
        } else if (current < previous && current < next) {
            markers.push({
                time: toChartTime(points[index].date),
                position: 'belowBar',
                color: '#ef4444',
                shape: 'arrowUp',
                size: 0.8,
                text: formatValue(current, locale),
            });
        }
    }

    const step = Math.max(1, Math.floor(markers.length / 20));

    return markers.filter((_, index) => index % step === 0);
}

function cssColor(variable: string): string {
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();

    if (!raw) {
        return '#888888';
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');

    if (!context) {
        return '#888888';
    }

    context.fillStyle = raw;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;

    return `rgb(${red}, ${green}, ${blue})`;
}

function toChartTime(date: string): Time {
    return /^\d+$/.test(date) ? (Number(date) as UTCTimestamp) : (date as Time);
}

function formatTick(
    time: UTCTimestamp | BusinessDay,
    tickMarkType: TickMarkType,
    locale: string,
): string {
    if (typeof time === 'number') {
        const date = new Date(time * 1000);

        if (
            tickMarkType === TickMarkType.DayOfMonth ||
            tickMarkType === TickMarkType.Month
        ) {
            return new Intl.DateTimeFormat(locale, {
                day: '2-digit',
                month: '2-digit',
            }).format(date);
        }

        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    if (tickMarkType === TickMarkType.Year) {
        return String(time.year);
    }

    return new Intl.DateTimeFormat(locale, {
        day: tickMarkType === TickMarkType.Month ? undefined : '2-digit',
        month: tickMarkType === TickMarkType.Month ? 'short' : '2-digit',
    }).format(new Date(Date.UTC(time.year, time.month - 1, time.day)));
}

function formatTime(time: BusinessDay | UTCTimestamp, locale: string): string {
    if (typeof time === 'number') {
        return new Intl.DateTimeFormat(locale, {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(time * 1000));
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
    }).format(new Date(Date.UTC(time.year, time.month - 1, time.day)));
}

function formatValue(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
