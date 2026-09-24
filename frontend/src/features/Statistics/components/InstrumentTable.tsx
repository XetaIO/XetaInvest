import { useTranslation } from 'react-i18next';
import type { InstrumentAllocation } from '../../../bindings/InstrumentAllocation';
import {
    deltaToneClass,
    formatEur,
    formatPercent,
} from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';

type Props = { rows: InstrumentAllocation[] };

const HEAD = 'px-3 py-2 font-medium';
const CELL = 'px-3 py-2';

export function InstrumentTable({ rows }: Props) {
    const { t } = useTranslation();
    return (
        <section className="rounded-2xl border border-gray-200 bg-white py-4 sm:py-6 dark:border-white/10 dark:bg-white/3">
            <h2 className="mb-2 px-4 text-base font-semibold text-gray-900 sm:px-6 dark:text-white">
                {t('statistics.detail_title')}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase dark:border-white/10 dark:text-white/40">
                            <th className={cn(HEAD, 'text-left')}>
                                {t('statistics.col_name')}
                            </th>
                            <th className={cn(HEAD, 'text-left')}>
                                {t('statistics.col_symbol')}
                            </th>
                            <th className={cn(HEAD, 'text-left')}>
                                {t('statistics.col_currency')}
                            </th>
                            <th className={cn(HEAD, 'text-right')}>
                                {t('statistics.col_value')}
                            </th>
                            <th className={cn(HEAD, 'text-right')}>
                                {t('statistics.col_allocation')}
                            </th>
                            <th className={cn(HEAD, 'text-right')}>
                                {t('statistics.col_pnl')}
                            </th>
                            <th className={cn(HEAD, 'text-right')}>
                                {t('statistics.col_pnl_pct')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.symbol}
                                className="border-b border-gray-100 text-gray-800 last:border-0 dark:border-white/5 dark:text-white/90"
                            >
                                <td className={cn(CELL, 'font-medium')}>
                                    {row.name || '—'}
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-gray-500 dark:text-white/50',
                                    )}
                                >
                                    {row.symbol}
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-gray-500 dark:text-white/50',
                                    )}
                                >
                                    {row.currency}
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-right tabular-nums',
                                    )}
                                >
                                    {formatEur(row.value_eur)}
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-right tabular-nums',
                                    )}
                                >
                                    {row.percent.toFixed(1)}%
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-right tabular-nums',
                                        row.pnl_eur !== 0 &&
                                            deltaToneClass(row.pnl_eur),
                                    )}
                                >
                                    {formatEur(row.pnl_eur)}
                                </td>
                                <td
                                    className={cn(
                                        CELL,
                                        'text-right tabular-nums',
                                        row.pnl_pct !== 0 &&
                                            deltaToneClass(row.pnl_pct),
                                    )}
                                >
                                    {formatPercent(row.pnl_pct)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
