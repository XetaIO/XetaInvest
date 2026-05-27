export type BudgetLineDraft = {
    name: string;
    amount: number;
};

export type BudgetGroupDraft = {
    name: string;
    lines: BudgetLineDraft[];
};

export type BudgetPayload = {
    id: number;
    currency: string;
    income: {
        lines: BudgetLineDraft[];
    };
    investments: {
        groups: BudgetGroupDraft[];
    };
    expenses: {
        groups: BudgetGroupDraft[];
    };
};

export type BudgetPageProps = {
    budget: BudgetPayload;
};

export type BudgetTab = 'income' | 'investments' | 'expenses';
