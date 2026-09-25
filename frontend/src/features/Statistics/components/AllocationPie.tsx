import { useTranslation } from 'react-i18next';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatEur } from '../../../shared/utils/format';
import { toPieSlices } from '../lib/statistics';
import type { AllocationItem } from '../lib/statistics';
import { ChartCard, ChartEmpty } from './ChartCard';

type Props = {
    title: string;
    description: string;
    items: AllocationItem[];
};

export function AllocationPie({ title, description, items }: Props) {
    const { t } = useTranslation();
    const slices = toPieSlices(items, t('common.other'));
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    const share = (value: number) =>
        total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '—';

    return (
        <ChartCard title={title} description={description}>
            {slices.length === 0 ? (
                <ChartEmpty label={t('common.no_data')} className="h-65" />
            ) : (
                <>
                    <div className="mx-auto aspect-square max-h-65 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        const slice = payload?.[0]?.payload as
                                            (typeof slices)[number] | undefined;
                                        if (!active || !slice) {
                                            return null;
                                        }
                                        return (
                                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-neutral-900">
                                                <span
                                                    className="h-2 w-2 rounded-sm"
                                                    style={{
                                                        background: slice.color,
                                                    }}
                                                />
                                                <span className="text-gray-500 dark:text-white/50">
                                                    {slice.label}
                                                </span>
                                                <span className="font-mono ml-auto text-gray-900 tabular-nums dark:text-white">
                                                    {formatEur(slice.value)} (
                                                    {share(slice.value)})
                                                </span>
                                            </div>
                                        );
                                    }}
                                />
                                <Pie
                                    data={slices}
                                    dataKey="value"
                                    nameKey="label"
                                    innerRadius={55}
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    paddingAngle={1}
                                    isAnimationActive={false}
                                >
                                    {slices.map((slice) => (
                                        <Cell
                                            key={slice.key}
                                            fill={slice.color}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-white/50">
                        {slices.map((slice) => (
                            <li
                                key={slice.key}
                                className="flex items-center gap-1.5"
                            >
                                <span
                                    className="h-2 w-2 rounded-sm"
                                    style={{ background: slice.color }}
                                />
                                {slice.label}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </ChartCard>
    );
}
