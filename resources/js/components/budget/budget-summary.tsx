import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { BudgetPayload } from '@/types';

const eur = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

type Props = { budget: BudgetPayload };

export function BudgetSummary({ budget }: Props) {
    const stats = useMemo(() => {
        const totalIncome = budget.income.lines.reduce((s, l) => s + (l.amount || 0), 0);
        const totalInvestments = budget.investments.groups.reduce(
            (s, g) => s + g.lines.reduce((ss, l) => ss + (l.amount || 0), 0),
            0,
        );
        const totalExpenses = budget.expenses.groups.reduce(
            (s, g) => s + g.lines.reduce((ss, l) => ss + (l.amount || 0), 0),
            0,
        );
        const remaining = totalIncome - totalExpenses - totalInvestments;
        const savingsRate =
            totalIncome > 0 ? (totalInvestments + Math.max(remaining, 0)) / totalIncome : 0;
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
                    Votre taux d'épargne est de{' '}
                    <strong>{pct.format(stats.savingsRate)}</strong> (taux d'épargne possible :{' '}
                    <strong>{pct.format(stats.possibleSavingsRate)}</strong>).
                </p>
                <p className="text-sm text-muted-foreground">
                    Reste à investir / épargner :{' '}
                    <strong
                        className={stats.remaining < 0 ? 'text-destructive' : 'text-foreground'}
                    >
                        {eur.format(stats.remaining)}
                    </strong>{' '}
                    · Revenus : <strong>{eur.format(stats.totalIncome)}</strong> · Dépenses :{' '}
                    <strong>{eur.format(stats.totalExpenses)}</strong> · Investissements :{' '}
                    <strong>{eur.format(stats.totalInvestments)}</strong>
                </p>
            </CardContent>
        </Card>
    );
}
