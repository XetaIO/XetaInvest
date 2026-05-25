import { Head, Link } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { SymbolChart } from '@/components/symbol-chart';
import { AddToWatchlistButton } from '@/components/watchlist/add-to-watchlist-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SymbolProps } from '@/types';

const glossary: Record<string, string> = {
    'PER': 'Price Earning Ratio — cours divisé par le bénéfice par action. Mesure combien d’années de bénéfices il faut pour rembourser le cours.',
    'PER prévis.': 'PER prévisionnel — cours divisé par le bénéfice par action attendu sur les 12 prochains mois.',
    'BPA': 'Bénéfice Par Action — résultat net divisé par le nombre d’actions en circulation.',
    'BPA prévis.': 'Bénéfice Par Action prévisionnel sur les 12 prochains mois.',
    'EBITDA': 'Earnings Before Interest, Taxes, Depreciation & Amortization — résultat avant intérêts, impôts, dépréciations et amortissements.',
    'Marge EBITDA': 'EBITDA divisé par le chiffre d’affaires.',
    'Marge brute': 'Profit brut divisé par le chiffre d’affaires.',
    'Marge op.': 'Marge opérationnelle — résultat d’exploitation divisé par le chiffre d’affaires.',
    'Marge nette': 'Résultat net divisé par le chiffre d’affaires.',
    'ROA': 'Return On Assets — rentabilité des actifs : résultat net divisé par le total des actifs.',
    'ROE': 'Return On Equity — rentabilité des capitaux propres : résultat net divisé par les capitaux propres.',
    'VE / CA': 'Valeur d’Entreprise rapportée au chiffre d’affaires.',
    'VE / EBITDA': 'Valeur d’Entreprise rapportée à l’EBITDA.',
    'Valeur entreprise': 'Valeur d’Entreprise (VE) — capitalisation boursière + dette nette. Coût théorique d’un rachat intégral.',
    'Cours / Actif net': 'Price-to-Book — cours rapporté à l’actif net comptable par action.',
    'Cours / CA': 'Price-to-Sales — capitalisation rapportée au chiffre d’affaires.',
    'Actif net / action': 'Book value — capitaux propres divisés par le nombre d’actions.',
    'Beta': 'Sensibilité du titre par rapport au marché. 1 = évolue comme le marché, >1 = plus volatil, <1 = moins volatil.',
    'Dette / Capitaux': 'Debt-to-Equity — dette totale divisée par les capitaux propres (exprimé en %).',
    'Current ratio': 'Actif courant divisé par le passif courant. >1 indique que l’entreprise peut couvrir ses dettes à court terme.',
    'Quick ratio': 'Actif courant moins stocks, divisé par le passif courant. Mesure de liquidité immédiate.',
    'Free cash-flow': 'Trésorerie disponible après investissements (FCF).',
    'Cash op.': 'Trésorerie générée par les opérations courantes.',
    'Tréso. / action': 'Trésorerie nette par action.',
    'CA / action': 'Chiffre d’affaires par action.',
    'Croissance CA': 'Variation du chiffre d’affaires sur les 12 derniers mois.',
    'Rdt dividende': 'Rendement du dividende — dividende annuel divisé par le cours.',
    'Taux distrib.': 'Payout ratio — part du résultat net versée en dividendes.',
    'Volume moyen 10j': 'Volume d’échanges moyen sur 10 séances.',
    'Volume moyen': 'Volume d’échanges moyen sur 3 mois.',
    '% Initiés': 'Part du capital détenue par les dirigeants et initiés.',
    '% Institutionnels': 'Part du capital détenue par des investisseurs institutionnels.',
    'Flottant': 'Actions disponibles à la négociation sur le marché.',
    'Variation 52s': 'Variation du cours sur les 52 dernières semaines.',
    'Moy. 50j': 'Cours moyen sur les 50 dernières séances.',
    'Moy. 200j': 'Cours moyen sur les 200 dernières séances.',
    'Reco.': 'Recommandation moyenne des analystes (buy / hold / sell).',
    'Nb. analystes': 'Nombre d’analystes ayant publié un avis.',
    'Clôture préc.': 'Cours de clôture de la séance précédente.',
    'Bid': 'Meilleur prix actuellement proposé à l’achat.',
    'Ask': 'Meilleur prix actuellement proposé à la vente.',
};

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

function statRow(label: string, value: string, tone: Tone = null) {
    const definition = glossary[label];

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
    const change = quote?.change ?? null;
    const changePercent = quote?.change_percent ?? null;
    const isPositive = (change ?? 0) >= 0;
    const currency = quote?.currency ?? null;

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
                        <CardTitle className="text-base">Actualités</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {news.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                Aucune actualité récente.
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

                <StatsCard title="Cotation">
                    {quote ? (
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Ouverture', formatPrice(quote.open, currency))}
                                {statRow('Clôture préc.', formatPrice(quote.previous_close, currency))}
                                {statRow('Plus haut (jour)', formatPrice(quote.day_high, currency))}
                                {statRow('Plus bas (jour)', formatPrice(quote.day_low, currency))}
                                {statRow('Bid', formatPrice(quote.bid, currency))}
                                {statRow('Ask', formatPrice(quote.ask, currency))}
                            </div>
                            <div>
                                {statRow('Plus haut (52s)', formatPrice(quote.fifty_two_week_high, currency))}
                                {statRow('Plus bas (52s)', formatPrice(quote.fifty_two_week_low, currency))}
                                {statRow('Variation 52s', formatPct(quote.fifty_two_week_change), toneSigned(quote.fifty_two_week_change))}
                                {statRow('Moy. 50j', formatPrice(quote.fifty_day_average, currency))}
                                {statRow('Moy. 200j', formatPrice(quote.two_hundred_day_average, currency))}
                                {statRow('Plus haut hist.', formatPrice(quote.all_time_high, currency))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Données non disponibles.</p>
                    )}
                </StatsCard>

                {quote && (
                    <StatsCard title="Valorisation">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Capitalisation', formatLarge(quote.market_cap))}
                                {statRow('Valeur entreprise', formatLarge(quote.enterprise_value))}
                                {statRow('PER', formatRatio(quote.pe), tonePE(quote.pe))}
                                {statRow('PER prévis.', formatRatio(quote.forward_pe), tonePE(quote.forward_pe))}
                                {statRow('Cours / Actif net', formatRatio(quote.price_to_book))}
                            </div>
                            <div>
                                {statRow('Cours / CA', formatRatio(quote.price_to_sales))}
                                {statRow('VE / CA', formatRatio(quote.enterprise_to_revenue))}
                                {statRow('VE / EBITDA', formatRatio(quote.enterprise_to_ebitda))}
                                {statRow('Actif net / action', formatRatio(quote.book_value))}
                                {statRow('Beta', formatRatio(quote.beta, 3))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title="Rentabilité">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Chiffre d\'affaires', formatLarge(quote.revenue))}
                                {statRow('Croissance CA', formatPct(quote.revenue_growth), toneSigned(quote.revenue_growth))}
                                {statRow('CA / action', formatRatio(quote.revenue_per_share))}
                                {statRow('EBITDA', formatLarge(quote.ebitda))}
                                {statRow('Profit brut', formatLarge(quote.gross_profits))}
                            </div>
                            <div>
                                {statRow('Marge brute', formatPct(quote.gross_margins), toneMargin(quote.gross_margins, 0.4, 0.2))}
                                {statRow('Marge op.', formatPct(quote.operating_margins), toneMargin(quote.operating_margins, 0.15, 0))}
                                {statRow('Marge nette', formatPct(quote.profit_margins), toneMargin(quote.profit_margins, 0.1, 0))}
                                {statRow('Marge EBITDA', formatPct(quote.ebitda_margins), toneMargin(quote.ebitda_margins, 0.2, 0.05))}
                                {statRow('BPA', formatRatio(quote.eps))}
                                {statRow('BPA prévis.', formatRatio(quote.forward_eps))}
                                {statRow('ROA', formatPct(quote.return_on_assets), toneMargin(quote.return_on_assets, 0.1, 0))}
                                {statRow('ROE', formatPct(quote.return_on_equity), toneMargin(quote.return_on_equity, 0.15, 0))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title="Santé financière">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Trésorerie', formatLarge(quote.total_cash))}
                                {statRow('Tréso. / action', formatRatio(quote.total_cash_per_share))}
                                {statRow('Dette totale', formatLarge(quote.total_debt))}
                                {statRow('Dette / Capitaux', formatRatio(quote.debt_to_equity), toneRatioLower(quote.debt_to_equity, 50, 150))}
                            </div>
                            <div>
                                {statRow('Free cash-flow', formatLarge(quote.free_cashflow))}
                                {statRow('Cash op.', formatLarge(quote.operating_cashflow))}
                                {statRow('Current ratio', formatRatio(quote.current_ratio), toneRatioHigher(quote.current_ratio, 1.5, 1))}
                                {statRow('Quick ratio', formatRatio(quote.quick_ratio), toneRatioHigher(quote.quick_ratio, 1, 0.7))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title="Volume & Actions">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Volume', formatLarge(quote.volume))}
                                {statRow('Volume moyen', formatLarge(quote.avg_volume))}
                                {statRow('Volume moyen 10j', formatLarge(quote.avg_volume_10d))}
                            </div>
                            <div>
                                {statRow('Actions en circ.', formatLarge(quote.shares_outstanding))}
                                {statRow('Flottant', formatLarge(quote.float_shares))}
                                {statRow('% Initiés', formatPct(quote.held_percent_insiders))}
                                {statRow('% Institutionnels', formatPct(quote.held_percent_institutions))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote && (
                    <StatsCard title="Dividendes & Analystes">
                        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                            <div>
                                {statRow('Dividende', formatRatio(quote.dividend_rate))}
                                {statRow('Rdt dividende', formatPct(quote.dividend_yield), quote.dividend_yield && quote.dividend_yield > 0 ? 'positive' : null)}
                                {statRow('Taux distrib.', formatPct(quote.payout_ratio), toneRatioLower(quote.payout_ratio, 0.6, 1))}
                            </div>
                            <div>
                                {statRow('Objectif moyen', formatPrice(quote.target_mean_price, currency), quote.target_mean_price !== null && quote.price !== null ? (quote.target_mean_price > quote.price ? 'positive' : 'negative') : null)}
                                {statRow('Objectif haut', formatPrice(quote.target_high_price, currency), quote.target_high_price !== null && quote.price !== null ? (quote.target_high_price > quote.price ? 'positive' : 'negative') : null)}
                                {statRow('Objectif bas', formatPrice(quote.target_low_price, currency), quote.target_low_price !== null && quote.price !== null ? (quote.target_low_price > quote.price ? 'positive' : 'negative') : null)}
                                {statRow('Nb. analystes', quote.number_of_analyst_opinions !== null ? String(quote.number_of_analyst_opinions) : '—')}
                                {statRow('Reco.', quote.recommendation_key ?? '—', toneRecommendation(quote.recommendation_key))}
                            </div>
                        </div>
                    </StatsCard>
                )}

                {quote?.long_business_summary && (
                    <StatsCard title="À propos">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {quote.long_business_summary}
                        </p>
                        <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                            {quote.sector && statRow('Secteur', quote.sector)}
                            {quote.industry && statRow('Industrie', quote.industry)}
                            {quote.country && statRow('Pays', [quote.city, quote.country].filter(Boolean).join(', '))}
                            {quote.full_time_employees !== null && statRow('Employés', formatLarge(quote.full_time_employees))}
                            {quote.website && (
                                <div className="flex items-center justify-between border-b border-border/40 py-1.5">
                                    <span className="text-xs text-muted-foreground">Site web</span>
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
                    <StatsCard title="Recommandations">
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
                                            Score {formatPercent(item.score)}
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
