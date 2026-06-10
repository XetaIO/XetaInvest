import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { CHART_MARGINS, CHART_RANGE_LABELS } from '@/lib/constants';
import {
    formatChartAxisTick,
    formatChartTooltipDate,
    formatNumber,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChartPoint, SymbolRange } from '@/types/symbol';

type Props = {
    symbol: string;
    initial: { range: SymbolRange; points: ChartPoint[] };
    availableRanges: SymbolRange[];
    currency?: string | null;
};

export function SymbolChart({
    symbol,
    initial,
    availableRanges,
    currency,
}: Props) {
    const { t, i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const [range, setRange] = useState<SymbolRange>(initial.range);
    const [points, setPoints] = useState<ChartPoint[]>(initial.points);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const config = {
        close: {
            label: t('symbol.chart_price'),
            color: 'var(--chart-1)',
        },
    } satisfies ChartConfig;

    const handleRangeChange = async (next: SymbolRange) => {
        if (next === range || loading) {
            return;
        }

        setRange(next);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/symbol/${encodeURIComponent(symbol)}/chart?range=${encodeURIComponent(next)}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('chart request failed');
            }

            const json: { points?: ChartPoint[] } = await response.json();
            setPoints(json.points ?? []);
        } catch {
            setError(t('symbol.chart_error'));
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="py-6">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-0">
                <CardTitle className="text-base">
                    {t('symbol.chart_title')}
                </CardTitle>
                <div className="flex flex-wrap gap-1">
                    {availableRanges.map((r) => (
                        <Button
                            key={r}
                            type="button"
                            variant={r === range ? 'default' : 'ghost'}
                            size="sm"
                            className={cn(
                                'h-7 px-2 text-xs',
                                r === range && 'font-semibold',
                            )}
                            onClick={() => handleRangeChange(r)}
                            disabled={loading}
                        >
                            {CHART_RANGE_LABELS[r] ?? r}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                {loading && (
                    <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('symbol.chart_loading')}
                    </div>
                )}

                {!loading && error && (
                    <div className="flex h-72 items-center justify-center text-sm text-destructive">
                        {error}
                    </div>
                )}

                {!loading && !error && points.length === 0 && (
                    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                        {t('symbol.chart_no_data')}
                    </div>
                )}

                {!loading && !error && points.length > 0 && (
                    <ChartContainer
                        config={config}
                        className="aspect-auto h-72 w-full"
                    >
                        <LineChart data={points} margin={CHART_MARGINS.DEFAULT}>
                            <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 3"
                            />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(v) =>
                                    formatChartAxisTick(String(v), range, loc)
                                }
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={64}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) =>
                                    formatNumber(Number(v), 2)
                                }
                            />
                            <ChartTooltip
                                cursor={true}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(label) =>
                                            formatChartTooltipDate(
                                                String(label),
                                                range,
                                                loc,
                                            )
                                        }
                                        formatter={(value) => (
                                            <div className="flex w-full items-center gap-2">
                                                <span className="text-muted-foreground">
                                                    {t('symbol.chart_price')}
                                                </span>
                                                <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                                                    {formatNumber(
                                                        Number(value),
                                                        2,
                                                    )}
                                                    {currency
                                                        ? ` ${currency}`
                                                        : ''}
                                                </span>
                                            </div>
                                        )}
                                    />
                                }
                            />
                            <Line
                                type="monotone"
                                dataKey="close"
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
