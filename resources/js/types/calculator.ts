export type CalculatorDefaults = {
    initial_capital_eur: number;
    monthly_savings_eur: number;
    has_portfolios: boolean;
    has_budget: boolean;
};

export type CalculatorPageProps = {
    defaults: CalculatorDefaults;
};

export type ScenarioKey = 'optimistic' | 'median' | 'pessimistic';

export type CalculatorPoint = {
    year: number;
    deposits_eur: number;
    optimistic_eur: number;
    median_eur: number;
    pessimistic_eur: number;
};

export type CalculatorInputs = {
    initialCapital: number;
    monthlyContribution: number;
    years: number;
    annualRatePct: number;
    scenarioDeltaPct: number;
    compoundIntervalMonths: number;
};
