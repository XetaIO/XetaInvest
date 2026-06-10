import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatSignedPercent } from '@/lib/format';

export type ChartSeries = {
    symbol: string;
    color: string;
    points: { t: number; v: number }[];
};

type Props = {
    series: ChartSeries[];
};

export function WatchlistChart({ series }: Props) {
    const { t, i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const config = useMemo<ChartConfig>(() => {
        const c: ChartConfig = {};

        for (const s of series) {
            c[s.symbol] = { label: s.symbol, color: s.color };
        }

        return c;
    }, [series]);

    const data = useMemo(() => {
        if (series.length === 0) {
            return [];
        }

        const baselines: Record<string, number | null> = {};

        for (const s of series) {
            baselines[s.symbol] = s.points[0]?.v ?? null;
        }

        const all = new Set<number>();

        for (const s of series) {
            for (const p of s.points) {
                all.add(p.t);
            }
        }

        const sorted = [...all].sort((a, b) => a - b);
        const last: Record<string, number | null> = {};

        for (const s of series) {
            last[s.symbol] = null;
        }

        return sorted.map((t) => {
            const row: Record<string, number | string> = { t };

            for (const s of series) {
                const point = s.points.find((p) => p.t === t);

                if (point) {
                    last[s.symbol] = point.v;
                }

                const base = baselines[s.symbol];
                const cur = last[s.symbol];

                if (base !== null && cur !== null && base !== 0) {
                    row[s.symbol] = ((cur - base) / base) * 100;
                }
            }

            return row;
        });
    }, [series]);

    if (series.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                {t('watchlist.no_symbol_chart')}
            </div>
        );
    }

    return (
        <ChartContainer config={config} className="aspect-auto h-80 w-full">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
                <defs>
                    {series.map((s) => (
                        <linearGradient
                            key={s.symbol}
                            id={`fill-${s.symbol}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={s.color}
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="100%"
                                stopColor={s.color}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(t) => {
                        const d = new Date(Number(t));

                        return new Intl.DateTimeFormat(loc, {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        }).format(d);
                    }}
                    tick={{ fontSize: 11 }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={60}
                    tickFormatter={(n) => `${n.toFixed(1)}%`}
                    tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                    cursor={true}
                    content={
                        <ChartTooltipContent
                            labelFormatter={(_label, payload) => {
                                const first = (
                                    payload as
                                        | Array<{ payload?: { t?: number } }>
                                        | undefined
                                )?.[0];
                                const t = first?.payload?.t;

                                return t
                                    ? new Date(Number(t)).toLocaleString()
                                    : '';
                            }}
                            formatter={(value, name) => (
                                <div className="flex w-full items-center gap-2">
                                    <span className="text-muted-foreground">
                                        {String(name)}
                                    </span>
                                    <span className="ml-auto font-mono font-medium text-foreground tabular-nums">
                                        {formatSignedPercent(Number(value))}
                                    </span>
                                </div>
                            )}
                        />
                    }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s) => (
                    <Area
                        key={s.symbol}
                        type="monotone"
                        dataKey={s.symbol}
                        stroke={s.color}
                        fill={`url(#fill-${s.symbol})`}
                        strokeWidth={2}
                        isAnimationActive={false}
                        connectNulls
                        activeDot={{ r: 3 }}
                    />
                ))}
            </AreaChart>
        </ChartContainer>
    );
}
