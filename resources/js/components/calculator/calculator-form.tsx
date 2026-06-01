import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CalculatorDefaults, CalculatorInputs } from '@/types';

type Props = {
    inputs: CalculatorInputs;
    onChange: (next: CalculatorInputs) => void;
    onReset: () => void;
    defaults: CalculatorDefaults;
};

export function CalculatorForm({ inputs, onChange, onReset, defaults }: Props) {
    const { t } = useTranslation();
    const set = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => {
        onChange({ ...inputs, [key]: value });
    };

    const numericChange = (key: keyof CalculatorInputs, raw: string) => {
        const parsed = raw === '' ? 0 : Number(raw);

        if (!Number.isFinite(parsed)) {
            return;
        }

        set(key, Math.max(0, parsed));
    };

    return (
        <Card className="py-6">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{t('calculator.settings_title')}</CardTitle>
                    <Button variant="outline" size="sm" onClick={onReset} className="h-8">
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        {t('common.reset')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                <Field
                    id="initialCapital"
                    label={t('calculator.field_initial_capital')}
                    suffix="EUR"
                    value={inputs.initialCapital}
                    onChange={(v) => numericChange('initialCapital', v)}
                    helper={
                        defaults.has_portfolios
                            ? t('calculator.helper_has_portfolios')
                            : t('calculator.helper_no_portfolios')
                    }
                />

                <Field
                    id="monthlyContribution"
                    label={t('calculator.field_monthly_savings')}
                    suffix="EUR / MOIS"
                    value={inputs.monthlyContribution}
                    onChange={(v) => numericChange('monthlyContribution', v)}
                    helper={
                        defaults.has_budget
                            ? t('calculator.helper_has_budget')
                            : t('calculator.helper_no_budget')
                    }
                />

                <Field
                    id="years"
                    label={t('calculator.field_horizon')}
                    suffix="ANNÉES"
                    value={inputs.years}
                    onChange={(v) => numericChange('years', v)}
                    step="1"
                    max={60}
                />

                <Field
                    id="annualRatePct"
                    label={t('calculator.field_annual_rate')}
                    suffix="%"
                    value={inputs.annualRatePct}
                    onChange={(v) => numericChange('annualRatePct', v)}
                    step="0.1"
                    helper={t('calculator.helper_rate')}
                />

                <Field
                    id="compoundIntervalMonths"
                    label={t('calculator.field_compound_interval')}
                    suffix="MOIS"
                    value={inputs.compoundIntervalMonths}
                    onChange={(v) => numericChange('compoundIntervalMonths', v)}
                    step="1"
                    min={1}
                    max={12}
                    helper={t('calculator.helper_compound')}
                />

                <Field
                    id="scenarioDeltaPct"
                    label={t('calculator.field_scenario_delta')}
                    suffix="%"
                    value={inputs.scenarioDeltaPct}
                    onChange={(v) => numericChange('scenarioDeltaPct', v)}
                    step="0.1"
                    helper={t('calculator.helper_delta')}
                />
            </CardContent>
        </Card>
    );
}

type FieldProps = {
    id: string;
    label: string;
    suffix: string;
    value: number;
    onChange: (v: string) => void;
    helper?: string;
    step?: string;
    min?: number;
    max?: number;
};

function Field({ id, label, suffix, value, onChange, helper, step = '1', min = 0, max }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id} className="text-sm font-medium">
                {label}
            </Label>
            <div className="relative">
                <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step={step}
                    value={Number.isFinite(value) ? value : 0}
                    onChange={(e) => onChange(e.target.value)}
                    className="pr-20 font-mono tabular-nums"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {suffix}
                </span>
            </div>
            {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
    );
}
