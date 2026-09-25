import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { InstrumentAllocation } from '../../../bindings/InstrumentAllocation';
import { formatEur, formatPercent } from '../../../shared/utils/format';
import { ChartCard, ChartEmpty } from './ChartCard';

const TONE_COLORS = { up: '#10b981', down: '#ef4444' } as const;

type Props = {
    title: string;
    description: string;
    emptyLabel: string;
    tone: keyof typeof TONE_COLORS;
    rows: InstrumentAllocation[];
};

export function MoversBar({
    title,
    description,
    emptyLabel,
    tone,
    rows,
}: Props) {
    const { t } = useTranslation();
    return (
        <ChartCard title={title} description={description}>
            {rows.length === 0 ? (
                <ChartEmpty label={emptyLabel} className="h-55" />
            ) : (
                <div className="h-55 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={rows}
                            layout="vertical"
                            margin={{ left: 12, right: 24 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="symbol"
                                width={70}
                                tickLine={false}
                                axisLine={false}
                                className="text-xs text-gray-500"
                            />
                            <Tooltip
                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                content={({ active, payload }) => {
                                    const row = payload?.[0]?.payload as
                                        InstrumentAllocation | undefined;
                                    if (!active || !row) {
                                        return null;
                                    }
                                    return (
                                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-900">
                                            <div className="mb-1 font-medium text-gray-900 dark:text-white">
                                                {row.name || row.symbol}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500 dark:text-white/50">
                                                    {t('statistics.col_pnl')}
                                                </span>
                                                <span className="font-mono ml-auto text-gray-900 tabular-nums dark:text-white">
                                                    {formatEur(row.pnl_eur)} (
                                                    {formatPercent(row.pnl_pct)}
                                                    )
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            <Bar
                                dataKey="pnl_pct"
                                fill={TONE_COLORS[tone]}
                                radius={4}
                                isAnimationActive={false}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </ChartCard>
    );
}
