import { Head, router } from '@inertiajs/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
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
            <Head title="Statistiques" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Select value={scope} onValueChange={handleScopeChange}>
                            <SelectTrigger className="min-w-[240px]">
                                <SelectValue placeholder="Choisir un portefeuille" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous mes portefeuilles</SelectItem>
                                {portfolios.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                        {p.is_default ? ' ★' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">
                            Mis à jour à {formatTime(stats.generated_at)}
                        </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
                        <RefreshCw className={cn('mr-1 h-4 w-4', isRefreshing && 'animate-spin')} />
                        Actualiser
                    </Button>
                </div>

                {stats.quote_error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Cours indisponibles</AlertTitle>
                        <AlertDescription>{stats.quote_error}</AlertDescription>
                    </Alert>
                )}

                {totals.position_count === 0 ? (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            Aucune position à analyser sur ce périmètre.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <KpiCard
                                label="Valeur actuelle"
                                value={formatEur(totals.current_value_eur)}
                                secondary={`${totals.instrument_count} instruments · ${totals.position_count} positions`}
                            />
                            <KpiCard label="Investi" value={formatEur(totals.invested_eur)} />
                            <KpiCard
                                label="P&L total"
                                value={formatEur(totals.pnl_eur)}
                                delta={{ value: formatPercent(totals.pnl_pct), tone: totals.pnl_eur }}
                            />
                            <KpiCard
                                label="Variation jour"
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
                                    ? 'Valeur et capital investi au fil du temps'
                                    : 'Valeur cumulée de tous vos portefeuilles'
                            }
                            data={stats.history}
                        />

                        <div className="grid gap-3 lg:grid-cols-2">
                            <AllocationPie
                                title="Répartition par instrument"
                                description="Part de chaque actif dans la valeur totale"
                                data={instrumentData}
                            />
                            <AllocationPie
                                title="Répartition par devise"
                                description="Exposition par devise de cotation"
                                data={currencyData}
                            />
                            <AllocationPie
                                title="Répartition par type d'actif"
                                description="Mix Actions / ETF / autres"
                                data={typeData}
                            />
                            {showByPortfolio && (
                                <AllocationPie
                                    title="Répartition par portefeuille"
                                    description="Poids de chaque portefeuille dans le total"
                                    data={portfolioData}
                                />
                            )}
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                            <MoversBar
                                title="Top gagnants"
                                description="Meilleurs P&L en pourcentage"
                                items={performance.top_gainers}
                                tone="up"
                                emptyLabel="Aucune position en plus-value."
                            />
                            <MoversBar
                                title="Top perdants"
                                description="Plus fortes baisses en pourcentage"
                                items={performance.top_losers}
                                tone="down"
                                emptyLabel="Aucune position en moins-value."
                            />
                        </div>

                        <Card className="py-6">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Détail par instrument</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto p-0">
                                <table className="w-full text-sm">
                                    <thead className="border-b text-xs uppercase text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Nom</th>
                                            <th className="px-3 py-2 text-left">Symbole</th>
                                            <th className="px-3 py-2 text-left">Devise</th>
                                            <th className="px-3 py-2 text-right">Valeur</th>
                                            <th className="px-3 py-2 text-right">Allocation</th>
                                            <th className="px-3 py-2 text-right">P&L</th>
                                            <th className="px-3 py-2 text-right">P&L %</th>
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
