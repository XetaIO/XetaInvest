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
import type { HistoryPointDto } from '../../../bindings/HistoryPointDto';
import { formatEur } from '../../../shared/utils/format';
import { historyDomain } from '../lib/statistics';
import { ChartCard, ChartEmpty } from './ChartCard';

const VALUE_COLOR = 'var(--chart-1)';
const INVESTED_COLOR = 'var(--chart-muted)';

type Props = {
    points: HistoryPointDto[];
    description: string;
};

function formatDay(date: string, locale: string, long: boolean): string {
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return new Intl.DateTimeFormat(
        locale,
        long
            ? { day: '2-digit', month: 'long', year: 'numeric' }
            : { day: '2-digit', month: '2-digit' },
    ).format(parsed);
}

export function HistoryLineChart({ points, description }: Props) {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage ?? 'fr';
    const series = [
        {
            key: 'value_eur',
            label: t('statistics.history_chart.label_value'),
            color: VALUE_COLOR,
        },
        {
            key: 'invested_eur',
            label: t('statistics.history_chart.label_invested'),
            color: INVESTED_COLOR,
        },
    ] as const;

    return (
        <ChartCard
            title={t('statistics.history_chart.title')}
            description={description}
        >
            {points.length === 0 ? (
                <ChartEmpty
                    label={t('statistics.history_chart.no_history')}
                    className="h-70"
                />
            ) : (
                <>
                    <div className="h-70 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={points}
                                margin={{
                                    left: 12,
                                    right: 12,
                                    top: 8,
                                    bottom: 0,
                                }}
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
                                        formatDay(String(value), locale, false)
                                    }
                                    className="text-xs text-gray-500"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    width={64}
                                    domain={historyDomain(points)}
                                    tickFormatter={(value) =>
                                        `${Math.round(Number(value))} €`
                                    }
                                    className="text-xs text-gray-500"
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) {
                                            return null;
                                        }
                                        return (
                                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-900">
                                                <div className="mb-1 text-gray-500 dark:text-white/50">
                                                    {formatDay(
                                                        String(label),
                                                        locale,
                                                        true,
                                                    )}
                                                </div>
                                                {series.map((item) => {
                                                    const entry = payload.find(
                                                        (row) =>
                                                            row.dataKey ===
                                                            item.key,
                                                    );
                                                    return (
                                                        <div
                                                            key={item.key}
                                                            className="flex items-center gap-2 text-gray-900 dark:text-white"
                                                        >
                                                            <span
                                                                className="h-2 w-2 rounded-sm"
                                                                style={{
                                                                    background:
                                                                        item.color,
                                                                }}
                                                            />
                                                            <span className="text-gray-500 dark:text-white/50">
                                                                {item.label}
                                                            </span>
                                                            <span className="font-mono ml-auto tabular-nums">
                                                                {formatEur(
                                                                    Number(
                                                                        entry?.value ??
                                                                            0,
                                                                    ),
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value_eur"
                                    stroke={VALUE_COLOR}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="invested_eur"
                                    stroke={INVESTED_COLOR}
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-white/50">
                        {series.map((item) => (
                            <li
                                key={item.key}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className="h-2 w-2 rounded-sm"
                                    style={{ background: item.color }}
                                />
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </ChartCard>
    );
}
