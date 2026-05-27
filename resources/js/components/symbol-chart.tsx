import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChartPoint, SymbolRange } from '@/types';

const RANGE_LABELS: Record<SymbolRange, string> = {
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

const config = {
    close: {
        label: 'Cours',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

type Props = {
    symbol: string;
    initial: { range: SymbolRange; points: ChartPoint[] };
    availableRanges: SymbolRange[];
    currency?: string | null;
};

function isIntradayRange(range: SymbolRange): boolean {
    return range === '1d' || range === '5d';
}

function parseDate(value: string | number): Date {
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        const n = Number(value);

        // Unix seconds vs milliseconds
        return new Date(n < 1e12 ? n * 1000 : n);
    }

    return new Date(String(value));
}

function formatXAxisTick(value: string, range: SymbolRange): string {
    const d = parseDate(value);

    if (Number.isNaN(d.getTime())) {
        return value;
    }

    if (isIntradayRange(range)) {
        return new Intl.DateTimeFormat('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    if (range === '1mo' || range === '3mo' || range === '6mo' || range === 'ytd') {
        return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d);
    }

    return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' }).format(d);
}

function formatTooltipLabel(value: string, range: SymbolRange): string {
    const d = parseDate(value);

    if (Number.isNaN(d.getTime())) {
        return value;
    }

    if (isIntradayRange(range)) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(d);
}

export function SymbolChart({ symbol, initial, availableRanges, currency }: Props) {
    const [range, setRange] = useState<SymbolRange>(initial.range);
    const [points, setPoints] = useState<ChartPoint[]>(initial.points);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setError('Impossible de charger le graphique.');
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="py-6">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-0">
                <CardTitle className="text-base">Historique du cours</CardTitle>
                <div className="flex flex-wrap gap-1">
                    {availableRanges.map((r) => (
                        <Button
                            key={r}
                            type="button"
                            variant={r === range ? 'default' : 'ghost'}
                            size="sm"
                            className={cn('h-7 px-2 text-xs', r === range && 'font-semibold')}
                            onClick={() => handleRangeChange(r)}
                            disabled={loading}
                        >
                            {RANGE_LABELS[r] ?? r}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                {loading && (
                    <div className="flex h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                    </div>
                )}

                {!loading && error && (
                    <div className="flex h-72 items-center justify-center text-sm text-destructive">
                        {error}
                    </div>
                )}

                {!loading && !error && points.length === 0 && (
                    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                        Aucune donnée disponible pour cette période.
                    </div>
                )}

                {!loading && !error && points.length > 0 && (
                    <ChartContainer config={config} className="aspect-auto h-72 w-full">
                        <LineChart data={points} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(v) => formatXAxisTick(String(v), range)}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={64}
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => formatNumber(Number(v), 2)}
                            />
                            <ChartTooltip
                                cursor={true}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(label) =>
                                            formatTooltipLabel(String(label), range)
                                        }
                                        formatter={(value) => (
                                            <div className="flex w-full items-center gap-2">
                                                <span className="text-muted-foreground">Cours</span>
                                                <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                                                    {formatNumber(Number(value), 2)}
                                                    {currency ? ` ${currency}` : ''}
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
