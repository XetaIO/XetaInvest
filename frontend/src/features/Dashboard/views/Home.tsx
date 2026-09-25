import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import type { DashboardResponse } from '../../../bindings/DashboardResponse';
import { locoErrorMessage } from '../../../shared/api/client';
import { PageMeta } from '../../../shared/components/common/PageMeta';
import { Button } from '../../../shared/components/ui/button/Button';
import {
    deltaToneClass,
    formatEur,
    formatPercent,
    formatTime,
} from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';
import { dashboardQueryOptions } from '../api/dashboard';
import { AddInvestmentModal } from '../components/AddInvestmentModal';
import { PortfolioSwitcher } from '../components/PortfolioSwitcher';
import { PositionRow } from '../components/PositionRow';

function errorMessage(error: unknown): string {
    return locoErrorMessage(error);
}

export function Home() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const portfolioId = Number(searchParams.get('portfolio') || '0');

    const dashboardQuery = useQuery(
        dashboardQueryOptions(Number.isFinite(portfolioId) ? portfolioId : 0),
    );
    const data: DashboardResponse | undefined = dashboardQuery.data;
    const portfolios = data?.portfolios ?? [];
    const active = data?.active ?? null;
    const positions = active?.kpis.positions ?? [];
    const [addOpen, setAddOpen] = useState(false);

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    function selectPortfolio(id: number) {
        if (id > 0) {
            setSearchParams({ portfolio: String(id) });
        } else {
            setSearchParams({});
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <PageMeta
                title={t('nav.dashboard')}
                description={t('dashboard.current_value')}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <PortfolioSwitcher
                        portfolios={portfolios}
                        active={active?.portfolio ?? null}
                        onSelect={selectPortfolio}
                    />
                    {active && (
                        <span className="text-xs text-gray-500 dark:text-white/50">
                            {t('dashboard.updated_at', {
                                time: formatTime(active.last_updated),
                            })}
                        </span>
                    )}
                </div>
                <Button
                    size="sm"
                    onClick={() => setAddOpen(true)}
                    disabled={!active}
                >
                    <Plus className="h-4 w-4" />
                    {t('dashboard.add_investment')}
                </Button>
            </div>

            {dashboardQuery.isError && (
                <p className="text-sm text-red-600">
                    {errorMessage(dashboardQuery.error)}
                </p>
            )}
            {active?.quote_error && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {active.quote_error}
                </p>
            )}

            {!active && (
                <p className="text-sm text-gray-500 dark:text-white/50">
                    {t('dashboard.create_first_portfolio')}
                </p>
            )}

            {active && (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Kpi
                            label={t('dashboard.current_value')}
                            value={formatEur(active.kpis.current_value)}
                        />
                        <Kpi
                            label={t('dashboard.invested_label')}
                            value={formatEur(active.kpis.total_invested)}
                        />
                        <Kpi
                            label={t('statistics.pnl')}
                            value={formatEur(active.kpis.pnl)}
                            hint={formatPercent(active.kpis.pnl_pct)}
                            tone={active.kpis.pnl}
                        />
                        <Kpi
                            label={t('dashboard.daily_change')}
                            value={formatEur(active.kpis.daily_change)}
                            hint={formatPercent(active.kpis.daily_change_pct)}
                            tone={active.kpis.daily_change}
                        />
                    </div>

                    {positions.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-white/50">
                            {t('dashboard.no_positions')}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {positions.map((position) => (
                                <PositionRow
                                    key={position.position_id}
                                    position={position}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {active && (
                <AddInvestmentModal
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    portfolioId={active.portfolio.id}
                    onCreated={() => void invalidate()}
                />
            )}
        </div>
    );
}

function Kpi({
    label,
    value,
    hint,
    tone,
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <p className="text-xs tracking-wide text-gray-500 uppercase dark:text-white/40">
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 text-xl font-semibold text-gray-800 dark:text-white/90',
                    tone !== undefined && deltaToneClass(tone),
                )}
            >
                {value}
            </p>
            {hint && (
                <p
                    className={cn(
                        'text-xs',
                        tone !== undefined
                            ? deltaToneClass(tone)
                            : 'text-gray-400',
                    )}
                >
                    {hint}
                </p>
            )}
        </div>
    );
}
