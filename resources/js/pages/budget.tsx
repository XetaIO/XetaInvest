import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BudgetSankey } from '@/components/budget/budget-sankey';
import { BudgetSummary } from '@/components/budget/budget-summary';
import { BudgetTabGroups } from '@/components/budget/budget-tab-groups';
import { BudgetTabRevenues } from '@/components/budget/budget-tab-revenues';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { update as updateBudget } from '@/routes/budget';
import type { BudgetGroupDraft, BudgetLineDraft, BudgetPageProps, BudgetTab } from '@/types';

const TABS: BudgetTab[] = ['income', 'investments', 'expenses'];

function buildPayload(
    income: BudgetLineDraft[],
    investments: BudgetGroupDraft[],
    expenses: BudgetGroupDraft[],
) {
    return {
        income: { lines: income },
        investments: { groups: investments },
        expenses: { groups: expenses },
    };
}

export default function BudgetPage({ budget }: BudgetPageProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<BudgetTab>('income');
    const [income, setIncome] = useState<BudgetLineDraft[]>(budget.income.lines);
    const [investments, setInvestments] = useState<BudgetGroupDraft[]>(budget.investments.groups);
    const [expenses, setExpenses] = useState<BudgetGroupDraft[]>(budget.expenses.groups);
    const [saving, setSaving] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const handle = window.setTimeout(() => {
            setSaving(true);
            router.put(updateBudget().url, buildPayload(income, investments, expenses), {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setSaving(false),
            });
        }, 800);

        return () => window.clearTimeout(handle);
    }, [income, investments, expenses]);

    const liveBudget = {
        ...budget,
        income: { lines: income },
        investments: { groups: investments },
        expenses: { groups: expenses },
    };

    const goToTab = (offset: number) => {
        const currentIdx = TABS.indexOf(tab);
        const nextIdx = currentIdx + offset;

        if (nextIdx >= 0 && nextIdx < TABS.length) {
            setTab(TABS[nextIdx]);
        }
    };

    return (
        <>
            <Head title={t('budget.title')} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('budget.title')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t('budget.subtitle')}
                        </p>
                    </div>
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                        {saving ? t('budget.saving') : t('budget.saved')}
                    </span>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as BudgetTab)}>
                    <TabsList>
                        <TabsTrigger value="income">{t('budget.income')}</TabsTrigger>
                        <TabsTrigger value="investments">{t('budget.investments')}</TabsTrigger>
                        <TabsTrigger value="expenses">{t('budget.expenses')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="income" className="mt-4">
                        <BudgetTabRevenues lines={income} onChange={setIncome} />
                    </TabsContent>
                    <TabsContent value="investments" className="mt-4">
                        <BudgetTabGroups
                            title={t('budget.investments')}
                            groups={investments}
                            onChange={setInvestments}
                            addGroupLabel={t('budget.add_investment_group')}
                            addLineLabel={t('budget.add_line_btn')}
                            groupPlaceholder={t('budget.group_placeholder_investments')}
                            linePlaceholder={t('budget.line_placeholder_investments')}
                            emptyText={t('budget.empty_investments')}
                        />
                    </TabsContent>
                    <TabsContent value="expenses" className="mt-4">
                        <BudgetTabGroups
                            title={t('budget.expenses')}
                            groups={expenses}
                            onChange={setExpenses}
                            addGroupLabel={t('budget.add_expense_group')}
                            addLineLabel={t('budget.add_line_btn')}
                            groupPlaceholder={t('budget.group_placeholder_expenses')}
                            linePlaceholder={t('budget.line_placeholder_expenses')}
                            emptyText={t('budget.empty_expenses')}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToTab(-1)}
                        disabled={TABS.indexOf(tab) === 0}
                    >
                        {t('common.back')}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => goToTab(1)}
                        disabled={TABS.indexOf(tab) === TABS.length - 1}
                    >
                        {t('common.next')}
                    </Button>
                </div>

                <BudgetSummary budget={liveBudget} />
                <BudgetSankey budget={liveBudget} />
            </div>
        </>
    );
}
