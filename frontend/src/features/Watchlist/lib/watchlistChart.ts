import type {
    BusinessDay,
    ChartOptions,
    DeepPartial,
    IChartApi,
    ISeriesApi,
    SeriesMarker,
    Time,
    UTCTimestamp,
} from 'lightweight-charts';
import { ColorType, TickMarkType } from 'lightweight-charts';
import type { ChartPointDto } from '../../../bindings/ChartPointDto';

export type ChartType = 'candlestick' | 'line' | 'line-markers';
export type SymbolRange =
    '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd';

export const CHART_RANGES: SymbolRange[] = [
    '1d',
    '5d',
    '1mo',
    '3mo',
    '6mo',
    '1y',
    '2y',
    '5y',
];

export const CHART_RANGE_LABELS: Record<SymbolRange, string> = {
    '1d': '1J',
    '5d': '5J',
    '1mo': '1M',
    '3mo': '3M',
    '6mo': '6M',
    '1y': '1A',
    '2y': '2A',
    '5y': '5A',
    '10y': '10A',
    ytd: 'YTD',
};

export const COMPARISON_COLORS = [
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
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

/**
 * Percent series from the first close (Laravel `normalizeChartPoints`).
 */
export function normalizeChartPoints(
    points: ChartPointDto[],
): Array<{ time: string; value: number }> {
    const baseline = points.find((point) =>
        Number.isFinite(point.close),
    )?.close;
    if (baseline === undefined || baseline === 0) {
        return [];
    }
    return points.map((point) => ({
        time: point.date,
        value: ((point.close - baseline) / baseline) * 100,
    }));
}

export function toChartTime(date: string): Time {
    return /^\d+$/.test(date) ? (Number(date) as UTCTimestamp) : (date as Time);
}

export function buildChartOptions(locale: string): DeepPartial<ChartOptions> {
    const dark = document.documentElement.classList.contains('dark');
    const text = dark ? '#98a2b3' : '#667085';
    const grid = dark ? 'rgba(255,255,255,0.10)' : '#e4e7ec';
    const labelBackground = dark ? '#1d2939' : '#f2f4f7';

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
            vertLine: { color: grid, labelBackgroundColor: labelBackground },
            horzLine: { color: grid, labelBackgroundColor: labelBackground },
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

export function removeAllSeries(
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

export function updatePrimarySeries(
    series: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>,
    points: ChartPointDto[],
    price: number,
    chartType: ChartType,
    range: SymbolRange,
) {
    const last = points[points.length - 1];
    if (!last) {
        return;
    }
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

export function buildTurningPointMarkers(
    points: ChartPointDto[],
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
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(Date.UTC(time.year, time.month - 1, time.day)),
    );
}

function formatValue(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
