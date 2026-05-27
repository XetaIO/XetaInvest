import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
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
            <Head title="Budget" />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-semibold">Calculateur de budget</h1>
                        <p className="text-sm text-muted-foreground">
                            Renseignez vos revenus, investissements et dépenses pour visualiser votre flux financier.
                        </p>
                    </div>
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                        {saving ? 'Enregistrement…' : 'Enregistré'}
                    </span>
                </div>

                <Tabs value={tab} onValueChange={(v) => setTab(v as BudgetTab)}>
                    <TabsList>
                        <TabsTrigger value="income">Revenus</TabsTrigger>
                        <TabsTrigger value="investments">Investissements</TabsTrigger>
                        <TabsTrigger value="expenses">Dépenses</TabsTrigger>
                    </TabsList>

                    <TabsContent value="income" className="mt-4">
                        <BudgetTabRevenues lines={income} onChange={setIncome} />
                    </TabsContent>
                    <TabsContent value="investments" className="mt-4">
                        <BudgetTabGroups
                            title="Investissements"
                            groups={investments}
                            onChange={setInvestments}
                            addGroupLabel="Ajouter une catégorie d'investissement"
                            addLineLabel="Ajouter une ligne"
                            groupPlaceholder="Nom de la catégorie (ex. Investissements mensuels)"
                            linePlaceholder="Ex. Actions"
                            emptyText="Aucune catégorie d'investissement pour le moment."
                        />
                    </TabsContent>
                    <TabsContent value="expenses" className="mt-4">
                        <BudgetTabGroups
                            title="Dépenses"
                            groups={expenses}
                            onChange={setExpenses}
                            addGroupLabel="Ajouter une catégorie de dépense"
                            addLineLabel="Ajouter une ligne"
                            groupPlaceholder="Nom de la catégorie (ex. Logement)"
                            linePlaceholder="Ex. Loyer"
                            emptyText="Aucune catégorie de dépense pour le moment."
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
                        Retour
                    </Button>
                    <Button
                        type="button"
                        onClick={() => goToTab(1)}
                        disabled={TABS.indexOf(tab) === TABS.length - 1}
                    >
                        Suivant
                    </Button>
                </div>

                <BudgetSummary budget={liveBudget} />
                <BudgetSankey budget={liveBudget} />
            </div>
        </>
    );
}
