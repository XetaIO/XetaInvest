import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatEur, formatPercent } from '@/lib/format';

export type MoverItem = {
    symbol: string;
    name: string | null;
    pnl_pct: number;
    pnl_eur: number;
};

type Props = {
    title: string;
    description?: string;
    items: MoverItem[];
    tone: 'up' | 'down';
    emptyLabel?: string;
};

const UP_COLOR = 'var(--chart-2)';
const DOWN_COLOR = 'var(--destructive)';

export function MoversBar({ title, description, items, tone, emptyLabel = 'Aucune donnée.' }: Props) {
    const color = tone === 'up' ? UP_COLOR : DOWN_COLOR;

    const config: ChartConfig = {
        pnl_pct: {
            label: 'P&L %',
            color,
        },
    };

    const data = items.map((item) => ({
        symbol: item.symbol,
        name: item.name ?? item.symbol,
        pnl_pct: item.pnl_pct,
        pnl_eur: item.pnl_eur,
    }));

    return (
        <Card className="py-6">
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                        {emptyLabel}
                    </div>
                ) : (
                    <ChartContainer config={config} className="h-[220px] w-full">
                        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
                            <YAxis
                                dataKey="symbol"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={70}
                            />
                            <XAxis type="number" hide />
                            <ChartTooltip
                                cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(_value, _name, item) => {
                                            const payload = (item as { payload?: { name?: string; pnl_pct?: number; pnl_eur?: number } } | undefined)?.payload;

                                            if (!payload) {
                                                return null;
                                            }

                                            return (
                                                <div className="flex w-full flex-col gap-0.5">
                                                    <span className="text-foreground font-medium">
                                                        {payload.name}
                                                    </span>
                                                    <div className="flex items-center justify-between gap-3 text-xs">
                                                        <span className="text-muted-foreground">P&L</span>
                                                        <span className="font-mono tabular-nums">
                                                            {formatEur(payload.pnl_eur ?? 0)} (
                                                            {formatPercent(payload.pnl_pct ?? 0)})
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Bar dataKey="pnl_pct" radius={4}>
                                {data.map((entry) => (
                                    <Cell key={entry.symbol} fill={color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
