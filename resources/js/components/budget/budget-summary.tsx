import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { calculateBudgetTotals } from '@/lib/budget';
import type { BudgetPayload } from '@/types/budget';

type Props = { budget: BudgetPayload };

export function BudgetSummary({ budget }: Props) {
    const { t, i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const eur = useMemo(
        () =>
            new Intl.NumberFormat(loc, {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
            }),
        [loc],
    );
    const pct = useMemo(
        () =>
            new Intl.NumberFormat(loc, {
                style: 'percent',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
        [loc],
    );
    const stats = useMemo(() => {
        const { totalIncome, totalInvestments, totalExpenses, remaining } =
            calculateBudgetTotals(budget);
        const savingsRate =
            totalIncome > 0
                ? (totalInvestments + Math.max(remaining, 0)) / totalIncome
                : 0;
        const possibleSavingsRate =
            totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

        return {
            totalIncome,
            totalInvestments,
            totalExpenses,
            remaining,
            savingsRate,
            possibleSavingsRate,
        };
    }, [budget]);

    return (
        <Card>
            <CardContent className="flex flex-col gap-3 py-6">
                <p className="text-sm leading-relaxed">
                    {t('budget.savings_rate_prefix')}{' '}
                    <strong>{pct.format(stats.savingsRate)}</strong>{' '}
                    {t('budget.savings_rate_possible')}{' '}
                    <strong>{pct.format(stats.possibleSavingsRate)}</strong>)
                </p>
                <p className="text-sm text-muted-foreground">
                    {t('budget.remaining_label')} :{' '}
                    <strong
                        className={
                            stats.remaining < 0
                                ? 'text-destructive'
                                : 'text-foreground'
                        }
                    >
                        {eur.format(stats.remaining)}
                    </strong>{' '}
                    · {t('budget.income_label')} :{' '}
                    <strong>{eur.format(stats.totalIncome)}</strong> ·{' '}
                    {t('budget.expenses_label')} :{' '}
                    <strong>{eur.format(stats.totalExpenses)}</strong> ·{' '}
                    {t('budget.investments_label')} :{' '}
                    <strong>{eur.format(stats.totalInvestments)}</strong>
                </p>
            </CardContent>
        </Card>
    );
}
