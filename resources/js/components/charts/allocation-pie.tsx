import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {

    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { formatEur } from '@/lib/format';

const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
] as const;

const OTHER_COLOR = 'var(--muted-foreground)';
const MAX_SLICES = 5;

export type AllocationItem = {
    key: string;
    label: string;
    value: number;
};

type Props = {
    title: string;
    description?: string;
    data: AllocationItem[];
    emptyLabel?: string;
};

export function AllocationPie({ title, description, data, emptyLabel = 'Aucune donnée à afficher.' }: Props) {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    let entries: AllocationItem[] = sorted;

    if (sorted.length > MAX_SLICES) {
        const head = sorted.slice(0, MAX_SLICES - 1);
        const tailValue = sorted.slice(MAX_SLICES - 1).reduce((sum, item) => sum + item.value, 0);
        entries = [...head, { key: '__other__', label: 'Autres', value: tailValue }];
    }

    const total = entries.reduce((sum, item) => sum + item.value, 0);

    const config: ChartConfig = entries.reduce<ChartConfig>((acc, item, index) => {
        acc[item.key] = {
            label: item.label,
            color: item.key === '__other__' ? OTHER_COLOR : CHART_COLORS[index % CHART_COLORS.length],
        };

        return acc;
    }, {});

    return (
        <Card className="flex flex-col py-6">
            <CardHeader className="items-start pb-0">
                <CardTitle className="text-base">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="flex-1 pb-2">
                {entries.length === 0 || total <= 0 ? (
                    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                        {emptyLabel}
                    </div>
                ) : (
                    <ChartContainer config={config} className="mx-auto aspect-square max-h-65">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, name, item) => {
                                            const numeric = Number(value);
                                            const pct = total > 0 ? (numeric / total) * 100 : 0;
                                            const payload = (item as { payload?: { fill?: string } } | undefined)?.payload;
                                            const color = payload?.fill ?? undefined;

                                            return (
                                                <div className="flex w-full items-center gap-2">
                                                    {color && (
                                                        <span
                                                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    )}
                                                    <span className="text-muted-foreground">{String(name ?? '')}</span>
                                                    <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                                                        {formatEur(numeric)}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        ({pct.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Pie
                                data={entries}
                                dataKey="value"
                                nameKey="label"
                                innerRadius={55}
                                strokeWidth={2}
                                paddingAngle={1}
                            >
                                {entries.map((item, index) => (
                                    <Cell
                                        key={item.key}
                                        fill={
                                            item.key === '__other__'
                                                ? OTHER_COLOR
                                                : CHART_COLORS[index % CHART_COLORS.length]
                                        }
                                    />
                                ))}
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="key" />}
                                verticalAlign="bottom"
                            />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
