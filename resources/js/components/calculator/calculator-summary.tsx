import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { formatEur, formatPercent } from '@/lib/format';
import type { CalculatorPoint } from '@/types';

type Props = {
    data: CalculatorPoint[];
};

export function CalculatorSummary({ data }: Props) {
    const { t } = useTranslation();
    const stats = useMemo(() => {
        if (data.length === 0) {
            return null;
        }

        const last = data[data.length - 1];
        const initial = data[0]?.median_eur ?? 0;
        const totalDeposits = last.deposits_eur;
        const contributions = totalDeposits - initial;
        const medianGain = last.median_eur - totalDeposits;
        const medianGainPct = totalDeposits > 0 ? medianGain / totalDeposits : 0;

        return {
            initial,
            contributions,
            totalDeposits,
            medianFinal: last.median_eur,
            optimisticFinal: last.optimistic_eur,
            pessimisticFinal: last.pessimistic_eur,
            medianGain,
            medianGainPct,
        };
    }, [data]);

    if (!stats) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Kpi
                label={t('calculator.scenario_median_full')}
                value={formatEur(stats.medianFinal)}
                tone="primary"
                sub={t('calculator.gains_label', { gain: formatEur(stats.medianGain), pct: formatPercent(stats.medianGainPct) })}
            />
            <Kpi
                label={t('calculator.scenario_optimistic_full')}
                value={formatEur(stats.optimisticFinal)}
                tone="positive"
            />
            <Kpi
                label={t('calculator.scenario_pessimistic_full')}
                value={formatEur(stats.pessimisticFinal)}
                tone="negative"
            />
            <Kpi
                label={t('calculator.field_initial_capital')}
                value={formatEur(stats.initial)}
                sub={t('calculator.start_point')}
            />
            <Kpi
                label={t('calculator.additional_contributions')}
                value={formatEur(stats.contributions)}
                sub={t('calculator.monthly_savings_cumul')}
            />
            <Kpi
                label={t('calculator.total_contributed')}
                value={formatEur(stats.totalDeposits)}
                sub={t('calculator.capital_plus_savings')}
            />
        </div>
    );
}

type KpiProps = {
    label: string;
    value: string;
    sub?: string;
    tone?: 'primary' | 'positive' | 'negative';
};

function Kpi({ label, value, sub, tone }: KpiProps) {
    const valueClass =
        tone === 'positive'
            ? 'text-emerald-600 dark:text-emerald-400'
            : tone === 'negative'
                ? 'text-rose-600 dark:text-rose-400'
                : tone === 'primary'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-foreground';

    return (
        <Card>
            <CardContent className="flex flex-col gap-1 py-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={`font-mono text-2xl font-semibold tabular-nums ${valueClass}`}>
                    {value}
                </p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
        </Card>
    );
}
