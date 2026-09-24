import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import type { StatisticsResponse } from '../../../bindings/StatisticsResponse';
import { locoErrorMessage } from '../../../shared/api/client';
import { PageMeta } from '../../../shared/components/common/PageMeta';
import { Button } from '../../../shared/components/ui/button/Button';
import {
    formatEur,
    formatPercent,
    formatTime,
} from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';
import type { StatisticsScopeParam } from '../api/statistics';
import { AllocationPie } from '../components/AllocationPie';
import { HistoryLineChart } from '../components/HistoryLineChart';
import { InstrumentTable } from '../components/InstrumentTable';
import { KpiCard } from '../components/KpiCard';
import { MoversBar } from '../components/MoversBar';
import { PositionsTreemap } from '../components/PositionsTreemap';
import { ScopeSelect } from '../components/ScopeSelect';
import { useStatistics } from '../hooks/useStatistics';
import { assetTypeKey, parseScopeParam } from '../lib/statistics';

export function StatisticsPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const scope = parseScopeParam(searchParams.get('portfolio'));
    const { query, isRefreshing, refresh } = useStatistics(scope);
    const stats = query.data;

    function selectScope(next: StatisticsScopeParam) {
        setSearchParams(next === 'all' ? {} : { portfolio: String(next) });
    }

    return (
        <div className="flex flex-col gap-6">
            <PageMeta
                title={t('statistics.title')}
                description={t('statistics.history_all')}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <ScopeSelect
                        portfolios={stats?.portfolios ?? []}
                        value={scope}
                        onChange={selectScope}
                    />
                    {stats && (
                        <span className="text-xs text-gray-500 dark:text-white/50">
                            {t('dashboard.updated_at', {
                                time: formatTime(stats.generated_at),
                            })}
                        </span>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refresh()}
                    disabled={isRefreshing || !stats}
                >
                    <RefreshCw
                        className={cn(
                            'h-4 w-4',
                            isRefreshing && 'animate-spin',
                        )}
                    />
                    {t('common.refresh')}
                </Button>
            </div>

            {query.isPending && (
                <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-500 dark:text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading')}
                </div>
            )}
            {query.isError && (
                <p className="text-sm text-red-600">
                    {locoErrorMessage(query.error)}
                </p>
            )}
            {stats && <StatisticsContent stats={stats} />}
        </div>
    );
}

function StatisticsContent({ stats }: { stats: StatisticsResponse }) {
    const { t } = useTranslation();
    const { totals, allocations, performance } = stats;
    const showByPortfolio =
        stats.scope.type === 'all' && allocations.by_portfolio.length > 1;

    return (
        <>
            {stats.quote_error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-medium">
                            {t('statistics.quote_error_title')}
                        </p>
                        <p>{stats.quote_error}</p>
                    </div>
                </div>
            )}

            {totals.position_count === 0 ? (
                <div className="rounded-xl border border-gray-200 px-4 py-10 text-center text-sm text-gray-500 dark:border-white/10 dark:text-white/50">
                    {t('statistics.no_positions')}
                </div>
            ) : (
                <>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <KpiCard
                            label={t('dashboard.current_value')}
                            value={formatEur(totals.current_value_eur)}
                            secondary={t('statistics.stat_details', {
                                instruments: totals.instrument_count,
                                positions: totals.position_count,
                            })}
                        />
                        <KpiCard
                            label={t('dashboard.invested_label')}
                            value={formatEur(totals.invested_eur)}
                        />
                        <KpiCard
                            label={t('statistics.pnl')}
                            value={formatEur(totals.pnl_eur)}
                            delta={{
                                value: formatPercent(totals.pnl_pct),
                                tone: totals.pnl_eur,
                            }}
                        />
                        <KpiCard
                            label={t('dashboard.daily_change')}
                            value={formatEur(totals.daily_change_eur)}
                            delta={{
                                value: formatPercent(totals.daily_change_pct),
                                tone: totals.daily_change_eur,
                            }}
                        />
                    </div>

                    <HistoryLineChart
                        points={stats.history}
                        description={t(
                            stats.scope.type === 'portfolio'
                                ? 'statistics.history_portfolio'
                                : 'statistics.history_all',
                        )}
                    />

                    <PositionsTreemap rows={allocations.by_instrument} />

                    <div className="grid gap-3 lg:grid-cols-2">
                        <AllocationPie
                            title={t('statistics.alloc_by_instrument')}
                            description={t('statistics.alloc_instrument_desc')}
                            items={allocations.by_instrument.map((row) => ({
                                key: row.symbol,
                                label: row.name || row.symbol,
                                value: row.value_eur,
                            }))}
                        />
                        <AllocationPie
                            title={t('statistics.alloc_by_currency')}
                            description={t('statistics.alloc_currency_desc')}
                            items={allocations.by_currency.map((row) => ({
                                key: row.currency,
                                label: row.currency,
                                value: row.value_eur,
                            }))}
                        />
                        <AllocationPie
                            title={t('statistics.alloc_by_type')}
                            description={t('statistics.alloc_type_desc')}
                            items={allocations.by_type.map((row) => {
                                const key = assetTypeKey(row.asset_type);
                                return {
                                    key: row.asset_type,
                                    label: key
                                        ? t(key)
                                        : row.asset_type.toUpperCase(),
                                    value: row.value_eur,
                                };
                            })}
                        />
                        {showByPortfolio && (
                            <AllocationPie
                                title={t('statistics.alloc_by_portfolio')}
                                description={t(
                                    'statistics.alloc_portfolio_desc',
                                )}
                                items={allocations.by_portfolio.map((row) => ({
                                    key: String(row.portfolio_id),
                                    label: row.name,
                                    value: row.value_eur,
                                }))}
                            />
                        )}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <MoversBar
                            title={t('statistics.top_gainers')}
                            description={t('statistics.top_gainers_desc')}
                            emptyLabel={t('statistics.no_gainers')}
                            tone="up"
                            rows={performance.top_gainers}
                        />
                        <MoversBar
                            title={t('statistics.top_losers')}
                            description={t('statistics.top_losers_desc')}
                            emptyLabel={t('statistics.no_losers')}
                            tone="down"
                            rows={performance.top_losers}
                        />
                    </div>

                    <InstrumentTable rows={allocations.by_instrument} />
                </>
            )}
        </>
    );
}
