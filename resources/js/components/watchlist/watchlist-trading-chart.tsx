import {
    BusinessDay,
    CandlestickData,
    CandlestickSeries,
    ChartOptions,
    ColorType,
    createChart,
    createSeriesMarkers,
    DeepPartial,
    IChartApi,
    IPriceLine,
    ISeriesApi,
    LineData,
    LineSeries,
    LineStyle,
    SeriesMarker,
    TickMarkType,
    Time,
    UTCTimestamp,
} from 'lightweight-charts';
import { BarChart2, Loader2, TrendingUp, Wallet } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useFinanceQueryStream } from '@/hooks/use-finance-query-stream';
import { CHART_RANGE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ChartPoint, PriceUpdate, SymbolRange, WatchlistItem } from '@/types';
import type { WatchlistPosition } from '@/types/watchlist';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = 'candlestick' | 'line' | 'line-markers';

type Props = {
    items: WatchlistItem[];
    wsUrl: string;
    /** Open positions (PRU) keyed by uppercase symbol */
    positions?: Record<string, WatchlistPosition>;
    /** Initially selected symbol (defaults to the first item) */
    defaultSymbol?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

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

// Seconds between two candles for each range — mirrors the backend interval
// mapping (1d→5m, 5d→15m, monthly+→1d, multi-year→1wk). Live WS updates are
// bucketed on this interval so a new candle is only appended when the bucket
// boundary is crossed.
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

// Builds Lightweight Charts options matching the current CSS theme
function buildChartOptions(): DeepPartial<ChartOptions> {
    // Resolve oklch CSS variables to rgb by letting the browser compute them
    const text = cssColor('--muted-foreground');
    const grid = cssColor('--border');
    const labelBg = cssColor('--secondary');

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
            vertLine: { color: grid, labelBackgroundColor: labelBg },
            horzLine: { color: grid, labelBackgroundColor: labelBg },
        },
        rightPriceScale: {
            borderColor: grid,
        },
        timeScale: {
            borderColor: grid,
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 4,
            tickMarkFormatter: (time: UTCTimestamp | BusinessDay, tickMarkType: TickMarkType) => {
                if (typeof time === 'number') {
                    const d = new Date(time * 1000);
                    const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
                    const fmtDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit' });
                    if (tickMarkType === TickMarkType.DayOfMonth || tickMarkType === TickMarkType.Month) {
                        return fmtDate.format(d);
                    }
                    return fmt.format(d);
                }
                // BusinessDay
                if (tickMarkType === TickMarkType.Year) {
                    return String(time.year);
                }
                if (tickMarkType === TickMarkType.Month) {
                    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(
                        new Date(Date.UTC(time.year, time.month - 1, 1)),
                    );
                }
                return `${String(time.day).padStart(2, '0')}/${String(time.month).padStart(2, '0')}`;
            },
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
            axisPressedMouseMove: {
                time: true,
                price: true,
            },
        },
        localization: {
            locale: 'fr-FR',
            timeFormatter: (time: BusinessDay | UTCTimestamp) => {
                if (typeof time === 'number') {
                    // Intraday — UTCTimestamp (seconds) → affiche heure Paris
                    return new Intl.DateTimeFormat('fr-FR', {
                        timeZone: 'Europe/Paris',
                        hour: '2-digit',
                        minute: '2-digit',
                    }).format(new Date(time * 1000));
                }
                // Daily — BusinessDay {year, month, day}
                const d = new Date(Date.UTC(time.year, time.month - 1, time.day));
                return new Intl.DateTimeFormat('fr-FR', {
                    timeZone: 'Europe/Paris',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }).format(d);
            },
        },
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WatchlistTradingChart({ items, wsUrl, positions = {}, defaultSymbol }: Props) {
    const { t, i18n } = useTranslation();

    // The symbol currently displayed
    const firstSymbol = defaultSymbol ?? items[0]?.instrument.symbol ?? '';
    const [selectedSymbol, setSelectedSymbol] = useState<string>(firstSymbol);
    const [chartType, setChartType] = useState<ChartType>('candlestick');
    const [range, setRange] = useState<SymbolRange>('3mo');
    const [points, setPoints] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPositionLine, setShowPositionLine] = useState(true);

    // Lightweight chart refs
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<
        ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null
    >(null);
    // Always holds the latest rendered points so the WS callback can reference them
    const pointsRef = useRef<ChartPoint[]>([]);
    const chartTypeRef = useRef<ChartType>(chartType);
    const rangeRef = useRef<SymbolRange>(range);
    const priceLineRef = useRef<IPriceLine | null>(null);

    useEffect(() => { pointsRef.current = points; }, [points]);
    useEffect(() => { chartTypeRef.current = chartType; }, [chartType]);
    useEffect(() => { rangeRef.current = range; }, [range]);

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = useCallback(
        async (symbol: string, r: SymbolRange) => {
            if (!symbol) return;

            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `/symbol/${encodeURIComponent(symbol)}/chart?range=${encodeURIComponent(r)}`,
                    { headers: { Accept: 'application/json' } },
                );

                if (!res.ok) throw new Error('fetch error');

                const json: { points?: ChartPoint[] } = await res.json();
                setPoints(json.points ?? []);
            } catch {
                setError(t('watchlist.trading_chart_error'));
                setPoints([]);
            } finally {
                setLoading(false);
            }
        },
        [t],
    );

    // Fetch when symbol or range changes
    useEffect(() => {
        void fetchData(selectedSymbol, range);
    }, [selectedSymbol, range, fetchData]);

    // ── Live WebSocket update ──────────────────────────────────────────────────
    // Live ticks are bucketed on the range's candle interval: a new candle is
    // only appended when the bucket boundary is crossed, otherwise the current
    // candle is updated in place (avoids the "one candle per second" artefact).
    const handleLiveUpdate = useCallback((update: PriceUpdate) => {
        const series = seriesRef.current;
        if (!series) return;
        if (update.id.toUpperCase() !== selectedSymbol.toUpperCase()) return;

        const price = update.price;
        const last = pointsRef.current[pointsRef.current.length - 1];
        if (!last) return;

        const isIntraday = /^\d+$/.test(last.date);

        // Daily / weekly ranges use BusinessDay times — we can't append a
        // UTCTimestamp candle without mixing time formats, so we only refresh
        // the last candle in place.
        if (!isIntraday) {
            if (chartTypeRef.current === 'candlestick') {
                const high = Math.max(last.high ?? price, price);
                const low = Math.min(last.low ?? price, price);
                (series as ISeriesApi<'Candlestick'>).update({
                    time: last.date as Time,
                    open: last.open ?? price,
                    high,
                    low,
                    close: price,
                });
                pointsRef.current[pointsRef.current.length - 1] = {
                    ...last,
                    high,
                    low,
                    close: price,
                };
            } else {
                (series as ISeriesApi<'Line'>).update({
                    time: last.date as Time,
                    value: price,
                });
                pointsRef.current[pointsRef.current.length - 1] = {
                    ...last,
                    close: price,
                };
            }
            return;
        }

        // Intraday — bucket the current time on the range interval.
        const interval = INTERVAL_SECONDS[rangeRef.current];
        const nowSec = Math.floor(Date.now() / 1000);
        const bucket = Math.floor(nowSec / interval) * interval;
        const lastTime = Number(last.date);
        const isNewBucket = bucket > lastTime;
        const time = bucket as UTCTimestamp;

        if (chartTypeRef.current === 'candlestick') {
            if (isNewBucket) {
                (series as ISeriesApi<'Candlestick'>).update({
                    time,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                });
                pointsRef.current = [
                    ...pointsRef.current,
                    {
                        ...last,
                        date: String(bucket),
                        open: price,
                        high: price,
                        low: price,
                        close: price,
                    },
                ];
            } else {
                const high = Math.max(last.high ?? price, price);
                const low = Math.min(last.low ?? price, price);
                (series as ISeriesApi<'Candlestick'>).update({
                    time: lastTime as UTCTimestamp,
                    open: last.open ?? price,
                    high,
                    low,
                    close: price,
                });
                pointsRef.current[pointsRef.current.length - 1] = {
                    ...last,
                    high,
                    low,
                    close: price,
                };
            }
        } else {
            (series as ISeriesApi<'Line'>).update({ time: isNewBucket ? time : (lastTime as UTCTimestamp), value: price });
            if (isNewBucket) {
                pointsRef.current = [
                    ...pointsRef.current,
                    { ...last, date: String(bucket), close: price },
                ];
            } else {
                pointsRef.current[pointsRef.current.length - 1] = {
                    ...last,
                    close: price,
                };
            }
        }
    }, [selectedSymbol]);

    useFinanceQueryStream({
        symbols: selectedSymbol ? [selectedSymbol] : [],
        wsUrl,
        onUpdate: handleLiveUpdate,
        enabled: !!selectedSymbol && !!wsUrl,
    });

    // When active watchlist changes and the selected symbol is gone, pick first
    useEffect(() => {
        const symbols = items.map((i) => i.instrument.symbol.toUpperCase());
        if (
            symbols.length > 0 &&
            !symbols.includes(selectedSymbol.toUpperCase())
        ) {
            setSelectedSymbol(symbols[0]);
        }
    }, [items, selectedSymbol]);

    // ── Chart initialization & theme watch ─────────────────────────────────────
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, buildChartOptions());

        chartRef.current = chart;

        // Dark mode observer — reapply colors when class toggles
        const mo = new MutationObserver(() => {
            chart.applyOptions(buildChartOptions());
        });
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            mo.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once — re-creating chart is expensive

    // ── Series rendering ───────────────────────────────────────────────────────
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || loading || points.length === 0) return;

        // Remove existing series
        if (seriesRef.current) {
            try {
                chart.removeSeries(seriesRef.current);
            } catch {
                /* already removed */
            }
            seriesRef.current = null;
        }

        const loc = i18n.resolvedLanguage ?? 'fr';

        if (chartType === 'candlestick') {
            const upColor = '#10b981';
            const downColor = '#ef4444';

            const series = chart.addSeries(CandlestickSeries, {
                upColor,
                downColor,
                borderUpColor: upColor,
                borderDownColor: downColor,
                wickUpColor: upColor,
                wickDownColor: downColor,
            });

            const candleData: CandlestickData[] = points
                .filter(
                    (p) => p.open !== null && p.high !== null && p.low !== null,
                )
                .map((p) => ({
                    time: toChartTime(p.date),
                    open: p.open as number,
                    high: p.high as number,
                    low: p.low as number,
                    close: p.close,
                }));

            series.setData(candleData);
            seriesRef.current = series;
        } else {
            // line or line-markers
            const isUp =
                points.length >= 2 &&
                points[points.length - 1].close >= points[0].close;
            const lineColor = isUp ? '#10b981' : '#ef4444';

            const series = chart.addSeries(LineSeries, {
                color: lineColor,
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
                priceLineVisible: true,
            });

            const lineData: LineData[] = points.map((p) => ({
                time: toChartTime(p.date),
                value: p.close,
            }));

            series.setData(lineData);

            if (chartType === 'line-markers') {
                // Add a marker at each high/low turning point (local maxima/minima)
                const markers: SeriesMarker<Time>[] = [];

                for (let i = 1; i < points.length - 1; i++) {
                    const prev = points[i - 1].close;
                    const curr = points[i].close;
                    const next = points[i + 1].close;

                    if (curr > prev && curr > next) {
                        // Local high
                        markers.push({
                            time: toChartTime(points[i].date),
                            position: 'aboveBar',
                            color: '#10b981',
                            shape: 'arrowDown',
                            size: 0.8,
                            text: formatVal(curr, loc),
                        });
                    } else if (curr < prev && curr < next) {
                        // Local low
                        markers.push({
                            time: toChartTime(points[i].date),
                            position: 'belowBar',
                            color: '#ef4444',
                            shape: 'arrowUp',
                            size: 0.8,
                            text: formatVal(curr, loc),
                        });
                    }
                }

                // Limit markers to avoid clutter (keep most significant)
                const step = Math.max(1, Math.floor(markers.length / 20));
                const filteredMarkers = markers.filter(
                    (_, i) => i % step === 0,
                );

                createSeriesMarkers(series, filteredMarkers);
            }

            seriesRef.current = series;
        }

        chart.timeScale().fitContent();
    }, [points, chartType, loading, i18n.resolvedLanguage]);

    // ── Position cost-basis (PRU) price line ───────────────────────────────────
    const position = positions[selectedSymbol.toUpperCase()];

    useEffect(() => {
        const series = seriesRef.current;
        if (!series) return;

        // Clear any previous line first
        if (priceLineRef.current) {
            try {
                series.removePriceLine(priceLineRef.current);
            } catch {
                /* series already removed */
            }
            priceLineRef.current = null;
        }

        if (!showPositionLine || !position || position.avg_price <= 0) return;

        priceLineRef.current = series.createPriceLine({
            price: position.avg_price,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: t('watchlist.trading_chart_position_line'),
        });
    }, [showPositionLine, position, points, chartType, loading, t]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const currency =
        items.find(
            (i) =>
                i.instrument.symbol.toUpperCase() ===
                selectedSymbol.toUpperCase(),
        )?.instrument.currency ?? '';

    const symbolOptions = items.map((i) => ({
        value: i.instrument.symbol.toUpperCase(),
        label: i.instrument.symbol.toUpperCase(),
        name: i.instrument.name,
    }));

    return (
        <Card className="py-6">
            <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base">
                        {t('watchlist.trading_chart_title')}
                        {currency && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {currency}
                            </span>
                        )}
                    </CardTitle>

                    {/* Controls row */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Symbol selector */}
                        <Select
                            value={selectedSymbol}
                            onValueChange={setSelectedSymbol}
                        >
                            <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {symbolOptions.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                        className="text-xs"
                                    >
                                        <span className="font-medium">
                                            {opt.label}
                                        </span>
                                        {opt.name && (
                                            <span className="ml-1 text-muted-foreground">
                                                {opt.name.length > 18
                                                    ? `${opt.name.slice(0, 18)}…`
                                                    : opt.name}
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Chart type buttons */}
                        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
                            {CHART_TYPES.map((ct) => (
                                <button
                                    key={ct.value}
                                    type="button"
                                    onClick={() => setChartType(ct.value)}
                                    title={t(
                                        ct.labelKey as Parameters<typeof t>[0],
                                    )}
                                    className={cn(
                                        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                                        chartType === ct.value
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {ct.icon}
                                    <span className="hidden sm:inline">
                                        {t(
                                            ct.labelKey as Parameters<
                                                typeof t
                                            >[0],
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Position cost-basis (PRU) toggle */}
                        {position && position.avg_price > 0 && (
                            <Button
                                type="button"
                                variant={showPositionLine ? 'default' : 'ghost'}
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                title={t('watchlist.trading_chart_position_toggle')}
                                onClick={() => setShowPositionLine((v) => !v)}
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">
                                    {t('watchlist.trading_chart_position_line')}
                                </span>
                            </Button>
                        )}

                        {/* Range buttons */}
                        <div className="flex items-center gap-0.5">
                            {RANGES.map((r) => (
                                <Button
                                    key={r}
                                    type="button"
                                    variant={r === range ? 'default' : 'ghost'}
                                    size="sm"
                                    className={cn(
                                        'h-7 px-2 text-xs',
                                        r === range && 'font-semibold',
                                    )}
                                    onClick={() => setRange(r)}
                                    disabled={loading}
                                >
                                    {CHART_RANGE_LABELS[r]}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0 pt-2">
                {/* Loading overlay */}
                {loading && (
                    <div className="flex h-95 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('watchlist.trading_chart_loading')}
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex h-95 items-center justify-center text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && points.length === 0 && (
                    <div className="flex h-95 items-center justify-center text-sm text-muted-foreground">
                        {t('watchlist.trading_chart_no_data')}
                    </div>
                )}

                {/* Chart container — always rendered so Lightweight Charts can mount */}
                <div
                    ref={containerRef}
                    className={cn(
                        'h-[400px] w-full overflow-hidden rounded-b-xl',
                        (loading || error || points.length === 0) && 'hidden',
                    )}
                />
            </CardContent>
        </Card>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves a CSS custom property to an rgb() string compatible with
 * Lightweight Charts. Uses an offscreen canvas to convert any color format
 * (including oklch) to raw pixel values — the only cross-browser safe approach.
 */
function cssColor(varName: string): string {
    // Read the raw CSS variable value from :root
    const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();

    if (!raw) return '#888888';

    // Paint the color onto a 1×1 canvas; getImageData always returns sRGB bytes
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#888888';

    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts a date value from the API to a lightweight-charts `Time`.
 * - If the string is a Unix timestamp (all digits), cast it as UTCTimestamp.
 * - Otherwise, assume it's already a `yyyy-mm-dd` business day string.
 */
function toChartTime(date: string): Time {
    if (/^\d+$/.test(date)) {
        return Number(date) as UTCTimestamp;
    }
    return date as Time;
}

function formatVal(v: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(v);
}
