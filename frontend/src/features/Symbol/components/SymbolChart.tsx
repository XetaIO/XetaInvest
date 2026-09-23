import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { ChartPointDto } from '../../../bindings/ChartPointDto';
import { Button } from '../../../shared/components/ui/button/Button';
import {
    formatChartAxisTick,
    formatChartTooltipDate,
    formatNumber,
} from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';
import { fetchSymbolChart } from '../api/symbol';

const RANGE_LABELS: Record<string, string> = {
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

type Props = {
    symbol: string;
    initial: { range: string; points: ChartPointDto[] };
    availableRanges: string[];
    currency?: string | null;
};

/**
 * Price history chart with range buttons (Laravel `SymbolChart`, Recharts).
 */
export function SymbolChart({
    symbol,
    initial,
    availableRanges,
    currency,
}: Props) {
    const { t, i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const [range, setRange] = useState(initial.range);
    const [points, setPoints] = useState(initial.points);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setRange(initial.range);
        setPoints(initial.points);
        setError(null);
        setLoading(false);
    }, [symbol, initial.range, initial.points]);

    async function handleRangeChange(next: string) {
        if (next === range || loading) {
            return;
        }
        setRange(next);
        setLoading(true);
        setError(null);
        try {
            const json = await fetchSymbolChart(symbol, next);
            setPoints(json.points ?? []);
        } catch {
            setError(t('symbol.chart_error'));
            setPoints([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-white/3">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {t('symbol.chart_title')}
                </h2>
                <div className="flex flex-wrap gap-1">
                    {availableRanges.map((item) => (
                        <Button
                            key={item}
                            type="button"
                            size="xs"
                            variant={item === range ? 'primary' : 'transparent'}
                            className={cn(
                                'h-7 px-2 py-0 text-xs',
                                item === range && 'font-semibold',
                            )}
                            onClick={() => void handleRangeChange(item)}
                            disabled={loading}
                        >
                            {RANGE_LABELS[item] ?? item}
                        </Button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="flex h-72 items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('symbol.chart_loading')}
                </div>
            )}

            {!loading && error && (
                <div className="flex h-72 items-center justify-center text-sm text-rose-600 dark:text-rose-400">
                    {error}
                </div>
            )}

            {!loading && !error && points.length === 0 && (
                <div className="flex h-72 items-center justify-center text-sm text-gray-500 dark:text-white/50">
                    {t('symbol.chart_no_data')}
                </div>
            )}

            {!loading && !error && points.length > 0 && (
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={points}
                            margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 3"
                                stroke="currentColor"
                                className="text-gray-200 dark:text-white/10"
                            />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value) =>
                                    formatChartAxisTick(
                                        String(value),
                                        range,
                                        loc,
                                    )
                                }
                                className="text-xs text-gray-500"
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={64}
                                domain={['auto', 'auto']}
                                tickFormatter={(value) =>
                                    formatNumber(Number(value), 2)
                                }
                                className="text-xs text-gray-500"
                            />
                            <Tooltip
                                cursor
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) {
                                        return null;
                                    }
                                    return (
                                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-900">
                                            <div className="mb-1 text-gray-500 dark:text-white/50">
                                                {formatChartTooltipDate(
                                                    String(label),
                                                    range,
                                                    loc,
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                                                <span className="text-gray-500 dark:text-white/50">
                                                    {t('symbol.chart_price')}
                                                </span>
                                                <span className="font-mono ml-auto tabular-nums">
                                                    {formatNumber(
                                                        Number(
                                                            payload[0].value,
                                                        ),
                                                        2,
                                                    )}
                                                    {currency
                                                        ? ` ${currency}`
                                                        : ''}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="close"
                                stroke="var(--color-brand-500, #465fff)"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </section>
    );
}
