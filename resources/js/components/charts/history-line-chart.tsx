import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { CHART_MARGINS } from '@/lib/constants';
import { formatEur, formatHistoryAxisDate, formatHistoryTooltipDate } from '@/lib/format';
import type { HistoryPoint } from '@/types';

type Props = {
    title?: string;
    description?: string;
    data: HistoryPoint[];
};

export function HistoryLineChart({
    title,
    description,
    data = [],
}: Props) {
    const { t, i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';

    const config = {
        value_eur: {
            label: t('history_chart.label_value'),
            color: 'var(--chart-1)',
        },
        invested_eur: {
            label: t('history_chart.label_invested'),
            color: 'var(--muted-foreground)',
        },
    } satisfies ChartConfig;

    const chartTitle = title ?? t('history_chart.title');
    // Calcul dynamique du domaine Y (min/max des valeurs affichées)
    const allValues = data.flatMap((d) => [d.value_eur, d.invested_eur]);
    let minY = Math.min(...allValues);
    let maxY = Math.max(...allValues);
    // Ajoute une marge visuelle de 5%
    const range = maxY - minY;

    if (range > 0) {
        minY = minY - range * 0.05;
        maxY = maxY + range * 0.05;
    }

    if (data.length === 0) {
        return (
            <Card className="py-6">
                <CardHeader className="pb-0">
                    <CardTitle className="text-base">{chartTitle}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="pb-2">
                    <div className="flex h-65 items-center justify-center text-sm text-muted-foreground">
                        {t('history_chart.no_history')}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="py-6">
            <CardHeader className="pb-0">
                <CardTitle className="text-base">{chartTitle}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="pb-2">
                <ChartContainer config={config} className="aspect-auto h-70 w-full">
                    <LineChart data={data} margin={CHART_MARGINS.DEFAULT}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(v) => formatHistoryAxisDate(String(v), loc)}
                        />
                        <YAxis
                            domain={[minY, maxY]}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={64}
                            tickFormatter={(value) => `${Math.round(value)} €`}
                        />
                        <ChartTooltip
                            cursor={true}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(label) => formatHistoryTooltipDate(String(label), loc)}
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
                            dataKey="value_eur"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="invested_eur"
                            stroke="var(--muted-foreground)"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                        <ChartLegend
                            content={<ChartLegendContent />}
                            verticalAlign="bottom"
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
