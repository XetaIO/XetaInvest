import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiReportCard } from '@/components/ai/ai-report-card';
import { AddInvestmentDialog } from '@/components/portfolio/add-investment-dialog';
import { KpiCard } from '@/components/portfolio/kpi-card';
import { PortfolioSwitcher } from '@/components/portfolio/portfolio-switcher';
import { PositionRow } from '@/components/portfolio/position-row';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatEur, formatPercent, formatTime } from '@/lib/format';
import { dashboard } from '@/routes';
import type { DashboardProps } from '@/types';

export default function Dashboard({ portfolios, active, transactionTypes, aiReport = null, aiGlobalReport = null }: DashboardProps) {
    const { t } = useTranslation();
    const [addOpen, setAddOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const portfolioId = active?.portfolio.id;

    useEffect(() => {
        if (!portfolioId) {
            return;
        }

        const id = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({ only: ['active'] });
        }, 60_000);

        return () => window.clearInterval(id);
    }, [portfolioId]);

    const refresh = () => {
        if (!portfolioId) {
            return;
        }

        setIsRefreshing(true);
        router.visit(
            dashboard({ query: { portfolio: String(portfolioId), refresh: '1' } }).url,
            {
                preserveScroll: true,
                only: ['active'],
                onFinish: () => setIsRefreshing(false),
            },
        );
    };

    return (
        <>
            <Head title={t('dashboard.title')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <PortfolioSwitcher portfolios={portfolios} active={active?.portfolio ?? null} />
                        {active && (
                            <span className="text-xs text-muted-foreground">
                                {t('dashboard.updated_at', { time: formatTime(active.last_updated) })}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refresh} disabled={!active || isRefreshing}>
                            <RefreshCw className={isRefreshing ? 'mr-1 h-4 w-4 animate-spin' : 'mr-1 h-4 w-4'} />
                            {t('common.refresh')}
                        </Button>
                        <Button size="sm" onClick={() => setAddOpen(true)} disabled={!portfolioId}>
                            <Plus className="mr-1 h-4 w-4" /> {t('dashboard.add_investment')}
                        </Button>
                    </div>
                </div>

                {!active && (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            {portfolios.length === 0
                                ? t('dashboard.create_first_portfolio')
                                : t('dashboard.select_portfolio_hint')}
                        </CardContent>
                    </Card>
                )}

                {active && (
                    <>
                        {active.quote_error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{t('dashboard.quote_error_title')}</AlertTitle>
                                <AlertDescription>{active.quote_error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <KpiCard label={t('dashboard.current_value')} value={formatEur(active.kpis.current_value_eur)} />
                            <KpiCard label={t('dashboard.invested_label')} value={formatEur(active.kpis.total_invested_eur)} />
                            <KpiCard
                                label={t('statistics.pnl')}
                                value={formatEur(active.kpis.pnl_eur)}
                                delta={{
                                    value: formatPercent(active.kpis.pnl_pct),
                                    tone: active.kpis.pnl_eur,
                                }}
                            />
                            <KpiCard
                                label={t('dashboard.daily_change')}
                                value={formatEur(active.kpis.daily_change_eur)}
                                delta={{
                                    value: formatPercent(active.kpis.daily_change_pct),
                                    tone: active.kpis.daily_change_eur,
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            {active.kpis.positions.length === 0 ? (
                                <Card>
                                    <CardContent className="p-10 text-center text-muted-foreground">
                                        {t('dashboard.no_position')}
                                    </CardContent>
                                </Card>
                            ) : (
                                active.kpis.positions.map((p) => (
                                    <PositionRow
                                        key={p.position_id}
                                        position={p}
                                        transactionTypes={transactionTypes}
                                    />
                                ))
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <AiReportCard report={aiReport} title="Analyse IA — portefeuille" />
                            <AiReportCard report={aiGlobalReport} title="Analyse IA — global" />
                        </div>
                    </>
                )}
            </div>

            {portfolioId && (
                <AddInvestmentDialog open={addOpen} onOpenChange={setAddOpen} portfolioId={portfolioId} />
            )}
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
