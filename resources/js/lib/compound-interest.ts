import type { CalculatorInputs, CalculatorPoint } from '@/types/calculator';

/**
 * Monthly compounding compound interest projection.
 * Contributions are added at the end of each month, interest accrues monthly
 * on the prior balance. Returns one CalculatorPoint per year, year 0 included.
 */
export function computeProjection(inputs: CalculatorInputs): CalculatorPoint[] {
    const years = Math.max(0, Math.floor(inputs.years));
    const months = years * 12;
    const interval = clampInterval(inputs.compoundIntervalMonths);

    const baseRate = inputs.annualRatePct / 100;
    const delta = inputs.scenarioDeltaPct / 100;

    const periodRates = {
        optimistic: periodRate(baseRate + delta, interval),
        median: periodRate(baseRate, interval),
        pessimistic: periodRate(baseRate - delta, interval),
    };

    const balances = {
        optimistic: inputs.initialCapital,
        median: inputs.initialCapital,
        pessimistic: inputs.initialCapital,
    };

    const points: CalculatorPoint[] = [
        {
            year: 0,
            deposits_eur: inputs.initialCapital,
            optimistic_eur: inputs.initialCapital,
            median_eur: inputs.initialCapital,
            pessimistic_eur: inputs.initialCapital,
        },
    ];

    let deposits = inputs.initialCapital;

    for (let m = 1; m <= months; m++) {
        if (m % interval === 0) {
            balances.optimistic *= 1 + periodRates.optimistic;
            balances.median *= 1 + periodRates.median;
            balances.pessimistic *= 1 + periodRates.pessimistic;
        }

        balances.optimistic += inputs.monthlyContribution;
        balances.median += inputs.monthlyContribution;
        balances.pessimistic += inputs.monthlyContribution;
        deposits += inputs.monthlyContribution;

        if (m % 12 === 0) {
            points.push({
                year: m / 12,
                deposits_eur: round(deposits),
                optimistic_eur: round(balances.optimistic),
                median_eur: round(balances.median),
                pessimistic_eur: round(balances.pessimistic),
            });
        }
    }

    return points;
}

function periodRate(annual: number, intervalMonths: number): number {
    // Nominal annual rate prorated to the compounding period (e.g. 7% / 12 for monthly).
    return (annual * intervalMonths) / 12;
}

function clampInterval(value: number): number {
    if (!Number.isFinite(value)) {
        return 1;
    }

    return Math.min(12, Math.max(1, Math.round(value)));
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
