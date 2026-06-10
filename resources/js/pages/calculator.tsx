import { Head, setLayoutProps } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculatorChart } from '@/components/calculator/calculator-chart';
import { CalculatorForm } from '@/components/calculator/calculator-form';
import { CalculatorSummary } from '@/components/calculator/calculator-summary';
import { computeProjection } from '@/lib/compound-interest';
import type {
    CalculatorDefaults,
    CalculatorInputs,
    CalculatorPageProps,
} from '@/types/calculator';

const DEFAULT_YEARS = 20;
const DEFAULT_RATE_PCT = 7;
const DEFAULT_SCENARIO_DELTA_PCT = 2;
const DEFAULT_COMPOUND_INTERVAL_MONTHS = 1;

function buildInputs(defaults: CalculatorDefaults): CalculatorInputs {
    return {
        initialCapital: defaults.initial_capital_eur,
        monthlyContribution: defaults.monthly_savings_eur,
        years: DEFAULT_YEARS,
        annualRatePct: DEFAULT_RATE_PCT,
        scenarioDeltaPct: DEFAULT_SCENARIO_DELTA_PCT,
        compoundIntervalMonths: DEFAULT_COMPOUND_INTERVAL_MONTHS,
    };
}

export default function CalculatorPage({ defaults }: CalculatorPageProps) {
    const { t } = useTranslation();
    setLayoutProps({
        breadcrumbs: [{ title: t('calculator.title'), href: '/calculator' }],
    });
    const [inputs, setInputs] = useState<CalculatorInputs>(() =>
        buildInputs(defaults),
    );

    const projection = useMemo(() => computeProjection(inputs), [inputs]);

    return (
        <>
            <Head title={t('calculator.title')} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        {t('calculator.title')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('calculator.subtitle')}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
                    <CalculatorForm
                        inputs={inputs}
                        onChange={setInputs}
                        onReset={() => setInputs(buildInputs(defaults))}
                        defaults={defaults}
                    />

                    <div className="flex flex-col gap-6">
                        <CalculatorChart data={projection} />
                        <CalculatorSummary data={projection} />
                    </div>
                </div>
            </div>
        </>
    );
}
