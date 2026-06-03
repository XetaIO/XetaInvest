import type { BudgetPayload } from '@/types';

export type BudgetTotals = {
    totalIncome: number;
    totalInvestments: number;
    totalExpenses: number;
    remaining: number;
};

/**
 * Computes the four key totals from a BudgetPayload.
 * Shared between BudgetSummary and BudgetSankey to avoid duplication.
 */
export function calculateBudgetTotals(budget: BudgetPayload): BudgetTotals {
    const totalIncome = budget.income.lines.reduce((sum, line) => sum + (line.amount || 0), 0);

    const totalInvestments = budget.investments.groups.reduce(
        (sum, group) => sum + group.lines.reduce((groupSum, line) => groupSum + (line.amount || 0), 0),
        0,
    );

    const totalExpenses = budget.expenses.groups.reduce(
        (sum, group) => sum + group.lines.reduce((groupSum, line) => groupSum + (line.amount || 0), 0),
        0,
    );

    return {
        totalIncome,
        totalInvestments,
        totalExpenses,
        remaining: totalIncome - totalExpenses - totalInvestments,
    };
}
