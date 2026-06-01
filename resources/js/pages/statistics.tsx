import { Head, router } from '@inertiajs/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AllocationPie } from '@/components/charts/allocation-pie';
import type { AllocationItem } from '@/components/charts/allocation-pie';
import { HistoryLineChart } from '@/components/charts/history-line-chart';
import { MoversBar } from '@/components/charts/movers-bar';
import { KpiCard } from '@/components/portfolio/kpi-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatEur, formatPercent, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatisticsProps } from '@/types';

const TYPE_LABELS: Record<string, string> = {
    stock: 'Action',
    equity: 'Action',
    etf: 'ETF',
    mutualfund: 'Fonds',
    cryptocurrency: 'Crypto',
    currency: 'Devise',
    index: 'Indice',
    future: 'Future',
    option: 'Option',
};

function formatType(type: string): string {
    return TYPE_LABELS[type.toLowerCase()] ?? type.toUpperCase();
}

function buildUrl(portfolio: string, refresh = false): string {
    const params = new URLSearchParams({ portfolio });

    if (refresh) {
        params.set('refresh', '1');
    }

    return `/statistics?${params.toString()}`;
}

export default function Statistics({ portfolios, scope, stats }: StatisticsProps) {
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleScopeChange = (value: string) => {
        router.visit(buildUrl(value), { preserveScroll: true });
    };

    const refresh = () => {
        setIsRefreshing(true);
        router.visit(buildUrl(scope, true), {
            preserveScroll: true,
            only: ['stats'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const { totals, allocations, performance } = stats;
    const showByPortfolio = stats.scope.type === 'all' && allocations.by_portfolio.length > 1;

    const instrumentData: AllocationItem[] = allocations.by_instrument.map((row) => ({
        key: row.symbol,
        label: row.name ?? row.symbol,
        value: row.value_eur,
    }));

    const currencyData: AllocationItem[] = allocations.by_currency.map((row) => ({
        key: row.currency,
        label: row.currency,
        value: row.value_eur,
    }));

    const typeData: AllocationItem[] = allocations.by_type.map((row) => ({
        key: row.type,
        label: formatType(row.type),
        value: row.value_eur,
    }));

    const portfolioData: AllocationItem[] = allocations.by_portfolio.map((row) => ({
        key: String(row.portfolio_id),
        label: row.name,
        value: row.value_eur,
    }));

    return (
        <>
            <Head title={t('statistics.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Select value={scope} onValueChange={handleScopeChange}>
                            <SelectTrigger className="min-w-[240px]">
                                <SelectValue placeholder={t('statistics.select_portfolio')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('statistics.all_portfolios')}</SelectItem>
                                {portfolios.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                        {p.is_default ? ' ★' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                            {t('dashboard.updated_at', { time: formatTime(stats.generated_at) })}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
                        <RefreshCw className={cn('mr-1 h-4 w-4', isRefreshing && 'animate-spin')} />
                        {t('common.refresh')}
                    </Button>
                </div>

                {stats.quote_error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{t('statistics.quote_error_title')}</AlertTitle>
                        <AlertDescription>{stats.quote_error}</AlertDescription>
                    </Alert>
                )}

                {totals.position_count === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            {t('statistics.no_positions')}
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <KpiCard
                                label={t('statistics.current_value')}
                                value={formatEur(totals.current_value_eur)}
                                secondary={t('statistics.stat_details', { instruments: totals.instrument_count, positions: totals.position_count })}
                            />
                            <KpiCard label={t('statistics.invested_label')} value={formatEur(totals.invested_eur)} />
                            <KpiCard
                                label={t('statistics.pnl')}
                                value={formatEur(totals.pnl_eur)}
                                delta={{ value: formatPercent(totals.pnl_pct), tone: totals.pnl_eur }}
                            />
                            <KpiCard
                                label={t('statistics.daily_change')}
                                value={formatEur(totals.daily_change_eur)}
                                delta={{
                                    value: formatPercent(totals.daily_change_pct),
                                    tone: totals.daily_change_eur,
                                }}
                            />
                        </div>

                        <HistoryLineChart
                            description={
                                stats.scope.type === 'portfolio'
                                    ? t('statistics.history_portfolio')
                                    : t('statistics.history_all')
                            }
                            data={stats.history}
                        />

                        <div className="grid gap-3 lg:grid-cols-2">
                            <AllocationPie
                                title={t('statistics.alloc_by_instrument')}
                                description={t('statistics.alloc_instrument_desc')}
                                data={instrumentData}
                            />
                            <AllocationPie
                                title={t('statistics.alloc_by_currency')}
                                description={t('statistics.alloc_currency_desc')}
                                data={currencyData}
                            />
                            <AllocationPie
                                title={t('statistics.alloc_by_type')}
                                description={t('statistics.alloc_type_desc')}
                                data={typeData}
                            />
                            {showByPortfolio && (
                                <AllocationPie
                                    title={t('statistics.alloc_by_portfolio')}
                                    description={t('statistics.alloc_portfolio_desc')}
                                    data={portfolioData}
                                />
                            )}
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            <MoversBar
                                title={t('statistics.top_gainers')}
                                description={t('statistics.top_gainers_desc')}
                                items={performance.top_gainers}
                                tone="up"
                                emptyLabel={t('statistics.no_gainers')}
                            />
                            <MoversBar
                                title={t('statistics.top_losers')}
                                description={t('statistics.top_losers_desc')}
                                items={performance.top_losers}
                                tone="down"
                                emptyLabel={t('statistics.no_losers')}
                            />
                        </div>

                        <Card className="py-6">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t('statistics.detail_title')}</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto p-0">
                                <table className="w-full text-sm">
                                    <thead className="border-b text-xs uppercase text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 text-left">{t('statistics.col_name')}</th>
                                            <th className="px-3 py-2 text-left">{t('statistics.col_symbol')}</th>
                                            <th className="px-3 py-2 text-left">{t('statistics.col_currency')}</th>
                                            <th className="px-3 py-2 text-right">{t('statistics.col_value')}</th>
                                            <th className="px-3 py-2 text-right">{t('statistics.col_allocation')}</th>
                                            <th className="px-3 py-2 text-right">{t('statistics.col_pnl')}</th>
                                            <th className="px-3 py-2 text-right">{t('statistics.col_pnl_pct')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allocations.by_instrument.map((row) => (
                                            <tr key={row.symbol} className="border-b last:border-0">
                                                <td className="px-3 py-2 font-medium">{row.name ?? '—'}</td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {row.symbol}
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {row.currency}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {formatEur(row.value_eur)}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {row.percent.toFixed(1)}%
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right tabular-nums',
                                                        row.pnl_eur > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : row.pnl_eur < 0
                                                                ? 'text-rose-600 dark:text-rose-400'
                                                                : '',
                                                    )}
                                                >
                                                    {formatEur(row.pnl_eur)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right tabular-nums',
                                                        row.pnl_pct > 0
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : row.pnl_pct < 0
                                                                ? 'text-rose-600 dark:text-rose-400'
                                                                : '',
                                                    )}
                                                >
                                                    {formatPercent(row.pnl_pct)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
}

Statistics.layout = {
    breadcrumbs: [
        {
            title: 'Statistiques',
            href: '/statistics',
        },
    ],
};
