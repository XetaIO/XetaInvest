import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatEur } from '@/lib/format';
import type { CalculatorPoint } from '@/types';

type Props = {
    data: CalculatorPoint[];
};

const config = {
    optimistic_eur: {
        label: 'Scénario optimiste',
        color: 'var(--color-emerald-400)',
    },
    median_eur: {
        label: 'Scénario médian',
        color: 'var(--color-blue-400)',
    },
    pessimistic_eur: {
        label: 'Scénario pessimiste',
        color: 'var(--color-rose-400)',
    },
    deposits_eur: {
        label: 'Versements cumulés',
        color: 'var(--muted-foreground)',
    },
} satisfies ChartConfig;

function formatAxisEur(value: number): string {
    const abs = Math.abs(value);

    if (abs >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M €`;
    }

    if (abs >= 1_000) {
        return `${Math.round(value / 1_000)}k €`;
    }

    return `${Math.round(value)} €`;
}

export function CalculatorChart({ data }: Props) {
    return (
        <Card className="py-6">
            <CardHeader className="pb-0">
                <CardTitle className="text-base">Projection sur {data.length > 0 ? data[data.length - 1].year : 0} ans</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
                <ChartContainer config={config} className="aspect-auto h-85 w-full">
                    <LineChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="year"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => `${value} an${value > 1 ? 's' : ''}`}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={72}
                            tickFormatter={formatAxisEur}
                        />
                        <ChartTooltip
                            cursor={true}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(label) => `Année ${label}`}
                                    formatter={(value, name) => {
                                        const numeric = Number(value);
                                        const key = String(name);
                                        const meta = config[key as keyof typeof config];
                                        const color = meta?.color;

                                        return (
                                            <div className="flex w-full items-center gap-2">
                                                {color && (
                                                    <span
                                                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                )}
                                                <span className="text-muted-foreground">
                                                    {meta?.label ?? key}
                                                </span>
                                                <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                                                    {formatEur(numeric)}
                                                </span>
                                            </div>
                                        );
                                    }}
                                />
                            }
                        />
                        <Line
                            type="monotone"
                            dataKey="optimistic_eur"
                            stroke="var(--color-emerald-400)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="median_eur"
                            stroke="var(--color-blue-400)"
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="pessimistic_eur"
                            stroke="var(--color-rose-400)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="deposits_eur"
                            stroke="var(--muted-foreground)"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                        <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
