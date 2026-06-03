import { Head, Link, setLayoutProps } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SymbolChart } from '@/components/symbol-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AddToWatchlistButton } from '@/components/watchlist/add-to-watchlist-button';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SymbolProps } from '@/types';

function formatPrice(value: number | null, currency: string | null): string {
    if (value === null) {
        return '—';
    }

    const formatted = formatNumber(value, 2);

    return currency ? `${formatted} ${currency}` : formatted;
}

function formatLarge(value: number | null): string {
    if (value === null) {
        return '—';
    }

    const abs = Math.abs(value);

    if (abs >= 1_000_000_000_000) {
        return `${(value / 1_000_000_000_000).toFixed(2)} T`;
    }

    if (abs >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)} B`;
    }

    if (abs >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)} M`;
    }

    if (abs >= 1_000) {
        return `${(value / 1_000).toFixed(1)} K`;
    }

    return formatNumber(value, 0);
}

function formatRatio(value: number | null, digits = 2): string {
    return value === null ? '—' : formatNumber(value, digits);
}

function formatPct(value: number | null): string {
    return value === null ? '—' : formatPercent(value);
}

type Tone = 'positive' | 'negative' | 'warning' | null;

const toneClass: Record<Exclude<Tone, null>, string> = {
    positive: 'text-emerald-500',
    negative: 'text-red-500',
    warning: 'text-amber-500',
};

function toneSigned(value: number | null): Tone {
    if (value === null || value === 0) {
        return null;
    }

    return value > 0 ? 'positive' : 'negative';
}

function toneMargin(value: number | null, goodMin = 0.2, warnMin = 0): Tone {
    if (value === null) {
        return null;
    }

    if (value >= goodMin) {
        return 'positive';
    }

    if (value >= warnMin) {
        return 'warning';
    }

    return 'negative';
}

function toneRatioHigher(value: number | null, goodMin: number, warnMin: number): Tone {
    if (value === null) {
        return null;
    }

    if (value >= goodMin) {
        return 'positive';
    }

    if (value >= warnMin) {
        return 'warning';
    }

    return 'negative';
}

function toneRatioLower(value: number | null, goodMax: number, warnMax: number): Tone {
    if (value === null) {
        return null;
    }

    if (value <= goodMax) {
        return 'positive';
    }

    if (value <= warnMax) {
        return 'warning';
    }

    return 'negative';
}

function tonePE(value: number | null): Tone {
    if (value === null) {
        return null;
    }

    if (value < 0) {
        return 'negative';
    }

    if (value <= 25) {
        return 'positive';
    }

    if (value <= 40) {
        return 'warning';
    }

    return 'negative';
}

function toneRecommendation(value: string | null): Tone {
    if (!value) {
        return null;
    }

    const key = value.toLowerCase();

    if (key.includes('buy')) {
        return 'positive';
    }

    if (key.includes('sell') || key.includes('underperform')) {
        return 'negative';
    }

    if (key.includes('hold') || key.includes('neutral')) {
        return 'warning';
    }

    return null;
}

function statRow(label: string, value: string, tone: Tone = null, definition?: string) {
    return (
        <div className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-0">
            {definition ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="cursor-help text-xs text-muted-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">
                            {label}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        {definition}
                    </TooltipContent>
                </Tooltip>
            ) : (
                <span className="text-xs text-muted-foreground">{label}</span>
            )}
            <span
                className={cn(
                    'text-sm font-medium tabular-nums',
                    tone && toneClass[tone],
                )}
            >
                {value}
            </span>
        </div>
    );
}

function StatsCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Card className="py-6">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export default function SymbolPage({
    symbol,
    quote,
    quote_error,
    chart,
    news,
    recommendations,
    available_ranges,
}: SymbolProps) {
    const { t } = useTranslation();
    setLayoutProps({ breadcrumbs: [{ title: quote?.name ?? symbol, href: `/symbol/${symbol}` }] });
    const change = quote?.change ?? null;
    const changePercent = quote?.change_percent ?? null;
    const isPositive = (change ?? 0) >= 0;
    const currency = quote?.currency ?? null;

    // Wrapper traduisant automatiquement le label et la définition du glossaire
    const sr = (key: string, value: string, tone?: Tone) => {
        const label = t(`symbol.${key}`);
        const def = t(`symbol.glossary.${key}`, { defaultValue: '' });

        return statRow(label, value, tone ?? null, def || undefined);
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <Head title={quote?.name ? `${quote.name} (${symbol})` : symbol} />

            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{symbol}</h1>
                        {quote?.name && (
                            <span className="text-lg text-muted-foreground">{quote.name}</span>
                        )}
                    </div>
                    <AddToWatchlistButton symbol={symbol} variant="outline" size="sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {quote?.exchange && <Badge variant="secondary">{quote.exchange}</Badge>}
                    {quote?.currency && <Badge variant="outline">{quote.currency}</Badge>}
                    {quote?.type && <Badge variant="outline">{quote.type}</Badge>}
                    {quote?.sector && <Badge variant="outline">{quote.sector}</Badge>}
                    {quote?.industry && <Badge variant="outline">{quote.industry}</Badge>}
                    {quote?.market_state && (
                        <Badge
                            variant={quote.market_state === 'REGULAR' ? 'default' : 'secondary'}
                        >
                            {quote.market_state}
                        </Badge>
                    )}
                </div>
            </div>

            {quote_error && (
                <Card>
                    <CardContent className="py-4 text-sm text-destructive">
                        {quote_error}
                    </CardContent>
                </Card>
            )}

            {quote && (
                <div className="flex flex-wrap items-baseline gap-4">
                    <span className="text-4xl font-bold tabular-nums">
                        {formatPrice(quote.price, currency)}
                    </span>
                    {change !== null && changePercent !== null && (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 text-base font-medium tabular-nums',
                                isPositive ? 'text-emerald-600' : 'text-red-600',
                            )}
                        >
                            {isPositive ? (
                                <ArrowUpRight className="h-4 w-4" />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" />
                            )}
                            {isPositive ? '+' : ''}
                            {formatNumber(change, 2)}
                            {' ('}
                            {formatPercent(changePercent)}
                            {')'}
                        </span>
                    )}
                </div>
            )}

            {/* Chart */}
            <SymbolChart
                symbol={symbol}
                initial={chart}
                availableRanges={available_ranges}
                currency={currency}
            />

            {/* News + Stats */}
            <div className="flex flex-col gap-4">
                <Card className="py-6">
                    <CardHeader>
                        <CardTitle className="text-base">{t('symbol.news')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {news.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                {t('symbol.no_news')}
                            </p>
                        )}
                        {news.map((item, index) => (
                            <a
                                key={`${item.link}-${index}`}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex gap-3 rounded-md border p-2 transition-colors hover:bg-accent"
                            >
                                {item.image && (
                                    <img
                                        src={item.image}
                                        alt=""
                                        className="h-14 w-14 shrink-0 rounded object-cover"
                                        loading="lazy"
                                    />
                                )}
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.source}
                                        {item.time ? ` · ${item.time}` : ''}
                                    </p>
                                </div>
                                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </a>
                        ))}
                    </CardContent>
                </Card>

                <StatsCard title={t('symbol.quote_section')}>
                    {quote ? (
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_open', formatPrice(quote.open, currency))}
                                {sr('stat_prev_close', formatPrice(quote.previous_close, currency))}
                                {sr('stat_day_high', formatPrice(quote.day_high, currency))}
                                {sr('stat_day_low', formatPrice(quote.day_low, currency))}
                                {sr('stat_bid', formatPrice(quote.bid, currency))}
                                {sr('stat_ask', formatPrice(quote.ask, currency))}
                            </div>
                            <div>
                                {sr('stat_week52_high', formatPrice(quote.fifty_two_week_high, currency))}
                                {sr('stat_week52_low', formatPrice(quote.fifty_two_week_low, currency))}
                                {sr('stat_week52_change', formatPct(quote.fifty_two_week_change), toneSigned(quote.fifty_two_week_change))}
                                {sr('stat_avg50', formatPrice(quote.fifty_day_average, currency))}
                                {sr('stat_avg200', formatPrice(quote.two_hundred_day_average, currency))}
                                {sr('stat_all_time_high', formatPrice(quote.all_time_high, currency))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('symbol.no_data')}</p>
                    )}
                </StatsCard>

                {quote && (
                    <StatsCard title={t('symbol.valuation_section')}>
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_market_cap', formatLarge(quote.market_cap))}
                                {sr('stat_enterprise_value', formatLarge(quote.enterprise_value))}
                                {sr('stat_pe', formatRatio(quote.pe), tonePE(quote.pe))}
                                {sr('stat_forward_pe', formatRatio(quote.forward_pe), tonePE(quote.forward_pe))}
                                {sr('stat_price_to_book', formatRatio(quote.price_to_book))}
                            </div>
                            <div>
                                {sr('stat_price_to_sales', formatRatio(quote.price_to_sales))}
                                {sr('stat_ev_revenue', formatRatio(quote.enterprise_to_revenue))}
                                {sr('stat_ev_ebitda', formatRatio(quote.enterprise_to_ebitda))}
                                {sr('stat_book_value', formatRatio(quote.book_value))}
                                {sr('stat_beta', formatRatio(quote.beta, 3))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title={t('symbol.profitability_section')}>
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_revenue', formatLarge(quote.revenue))}
                                {sr('stat_revenue_growth', formatPct(quote.revenue_growth), toneSigned(quote.revenue_growth))}
                                {sr('stat_revenue_per_share', formatRatio(quote.revenue_per_share))}
                                {sr('stat_ebitda', formatLarge(quote.ebitda))}
                                {sr('stat_gross_profits', formatLarge(quote.gross_profits))}
                            </div>
                            <div>
                                {sr('stat_gross_margins', formatPct(quote.gross_margins), toneMargin(quote.gross_margins, 0.4, 0.2))}
                                {sr('stat_operating_margins', formatPct(quote.operating_margins), toneMargin(quote.operating_margins, 0.15, 0))}
                                {sr('stat_profit_margins', formatPct(quote.profit_margins), toneMargin(quote.profit_margins, 0.1, 0))}
                                {sr('stat_ebitda_margins', formatPct(quote.ebitda_margins), toneMargin(quote.ebitda_margins, 0.2, 0.05))}
                                {sr('stat_eps', formatRatio(quote.eps))}
                                {sr('stat_forward_eps', formatRatio(quote.forward_eps))}
                                {sr('stat_roa', formatPct(quote.return_on_assets), toneMargin(quote.return_on_assets, 0.1, 0))}
                                {sr('stat_roe', formatPct(quote.return_on_equity), toneMargin(quote.return_on_equity, 0.15, 0))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title={t('symbol.health_section')}>
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_total_cash', formatLarge(quote.total_cash))}
                                {sr('stat_cash_per_share', formatRatio(quote.total_cash_per_share))}
                                {sr('stat_total_debt', formatLarge(quote.total_debt))}
                                {sr('stat_debt_to_equity', formatRatio(quote.debt_to_equity), toneRatioLower(quote.debt_to_equity, 50, 150))}
                            </div>
                            <div>
                                {sr('stat_fcf', formatLarge(quote.free_cashflow))}
                                {sr('stat_operating_cf', formatLarge(quote.operating_cashflow))}
                                {sr('stat_current_ratio', formatRatio(quote.current_ratio), toneRatioHigher(quote.current_ratio, 1.5, 1))}
                                {sr('stat_quick_ratio', formatRatio(quote.quick_ratio), toneRatioHigher(quote.quick_ratio, 1, 0.7))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title={t('symbol.volume_section')}>
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_volume', formatLarge(quote.volume))}
                                {sr('stat_avg_volume', formatLarge(quote.avg_volume))}
                                {sr('stat_avg_volume_10d', formatLarge(quote.avg_volume_10d))}
                            </div>
                            <div>
                                {sr('stat_shares_outstanding', formatLarge(quote.shares_outstanding))}
                                {sr('stat_float_shares', formatLarge(quote.float_shares))}
                                {sr('stat_insiders', formatPct(quote.held_percent_insiders))}
                                {sr('stat_institutions', formatPct(quote.held_percent_institutions))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title={t('symbol.dividends_section')}>
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {sr('stat_dividend', formatRatio(quote.dividend_rate))}
                                {sr('stat_yield', formatPct(quote.dividend_yield), quote.dividend_yield && quote.dividend_yield > 0 ? 'positive' : null)}
                                {sr('stat_payout', formatPct(quote.payout_ratio), toneRatioLower(quote.payout_ratio, 0.6, 1))}
                            </div>
                            <div>
                                {sr('stat_target_mean', formatPrice(quote.target_mean_price, currency), quote.target_mean_price !== null && quote.price !== null ? (quote.target_mean_price > quote.price ? 'positive' : 'negative') : null)}
                                {sr('stat_target_high', formatPrice(quote.target_high_price, currency), quote.target_high_price !== null && quote.price !== null ? (quote.target_high_price > quote.price ? 'positive' : 'negative') : null)}
                                {sr('stat_target_low', formatPrice(quote.target_low_price, currency), quote.target_low_price !== null && quote.price !== null ? (quote.target_low_price > quote.price ? 'positive' : 'negative') : null)}
                                {sr('stat_analysts', quote.number_of_analyst_opinions !== null ? String(quote.number_of_analyst_opinions) : '—')}
                                {sr('stat_recommendation', quote.recommendation_key ?? '—', toneRecommendation(quote.recommendation_key))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote?.long_business_summary && (
                    <StatsCard title={t('symbol.about_section')}>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {quote.long_business_summary}
                        </p>
                        <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                            {quote.sector && sr('stat_sector', quote.sector)}
                            {quote.industry && sr('stat_industry', quote.industry)}
                            {quote.country && sr('stat_country', [quote.city, quote.country].filter(Boolean).join(', '))}
                            {quote.full_time_employees !== null && sr('stat_employees', formatLarge(quote.full_time_employees))}
                            {quote.website && (
                                <div className="flex items-center justify-between border-b border-border/40 py-1.5">
                                    <span className="text-xs text-muted-foreground">{t('symbol.stat_website')}</span>
                                    <a
                                        href={quote.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        {quote.website.replace(/^https?:\/\//, '')}
                                    </a>
                                </div>
                            )}
                        </div>
                    </StatsCard>
                )}

                {recommendations.length > 0 && (
                    <StatsCard title={t('symbol.recommendations_section')}>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            {recommendations.map((item) => (
                                <Link
                                    key={item.symbol}
                                    href={`/symbol/${encodeURIComponent(item.symbol)}`}
                                    className="group flex flex-col gap-1 rounded-md border p-3 transition-colors hover:bg-accent"
                                >
                                    <span className="text-sm font-semibold group-hover:underline">
                                        {item.symbol}
                                    </span>
                                    {item.name && (
                                        <span className="line-clamp-2 text-xs text-muted-foreground">
                                            {item.name}
                                        </span>
                                    )}
                                    {item.score !== null && (
                                        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {t('symbol.score_label', { pct: formatPercent(item.score) })}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </StatsCard>
                )}
            </div>
        </div>
    );
}
