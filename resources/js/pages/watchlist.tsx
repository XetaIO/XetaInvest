import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import { ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiReportCard } from '@/components/ai/ai-report-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WatchlistFormDialog } from '@/components/watchlist/watchlist-form-dialog';
import { WatchlistPanel } from '@/components/watchlist/watchlist-panel';
import { WatchlistTradingChart } from '@/components/watchlist/watchlist-trading-chart';
import { useFinanceQueryStream } from '@/hooks/use-finance-query-stream';
import { flattenWatchlistItems, mergePriceUpdate } from '@/lib/watchlist';
import type { AiReport } from '@/types/ai';
import type {
    PriceUpdate,
    Watchlist,
    WatchlistLimits,
    WatchlistPosition,
} from '@/types/watchlist';

type SharedProps = {
    financeQueryWsUrl?: string;
};

type PageProps = {
    watchlists: Watchlist[];
    activeWatchlistId: string | null;
    limits: WatchlistLimits;
    aiWatchlistReport?: AiReport | null;
    positions: Record<string, WatchlistPosition>;
};

type RawQuote = {
    regularMarketPrice?: unknown;
    price?: unknown;
    regularMarketOpen?: unknown;
    open?: unknown;
    regularMarketPreviousClose?: unknown;
    previousClose?: unknown;
    regularMarketChange?: unknown;
    change?: unknown;
    regularMarketChangePercent?: unknown;
    changePercent?: unknown;
    currency?: unknown;
    exchange?: unknown;
};

export default function WatchlistPage({
    watchlists,
    activeWatchlistId,
    limits,
    aiWatchlistReport = null,
    positions,
}: PageProps) {
    const { t } = useTranslation();
    const page = usePage<SharedProps>();
    const wsUrl = page.props.financeQueryWsUrl ?? '';
    const [createOpen, setCreateOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());

    setLayoutProps({
        breadcrumbs: [{ title: t('watchlist.title'), href: '/watchlists' }],
    });

    const active = useMemo(
        () =>
            watchlists.find(
                (watchlist) => watchlist.id === activeWatchlistId,
            ) ?? null,
        [watchlists, activeWatchlistId],
    );
    const items = useMemo(
        () => flattenWatchlistItems(active?.sections ?? []),
        [active],
    );
    const symbols = useMemo(
        () => items.map((item) => item.instrument.symbol.toUpperCase()),
        [items],
    );
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const effectiveSelectedSymbol = symbols.includes(selectedSymbol)
        ? selectedSymbol
        : (symbols[0] ?? '');

    useEffect(() => {
        if (symbols.length === 0) {
            return;
        }

        const controller = new AbortController();

        void fetch(
            `/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`,
            {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
            },
        )
            .then((response) => (response.ok ? response.json() : null))
            .then(
                (
                    payload: {
                        quotes?: Record<string, RawQuote>;
                    } | null,
                ) => {
                    const quotes = payload?.quotes;

                    if (!quotes) {
                        return;
                    }

                    setPrices((current) => {
                        const next = new Map(current);

                        for (const [symbol, quote] of Object.entries(quotes)) {
                            const normalized = normalizeQuote(symbol, quote);

                            if (normalized) {
                                next.set(symbol.toUpperCase(), normalized);
                            }
                        }

                        return next;
                    });
                },
            )
            .catch(() => {
                // Live updates can still populate the table.
            });

        return () => controller.abort();
    }, [symbols]);

    const handlePriceUpdate = useCallback((update: PriceUpdate) => {
        const symbol = update.id.toUpperCase();

        setPrices((current) => {
            const next = new Map(current);
            const previous = next.get(symbol);
            next.set(symbol, mergePriceUpdate(previous, update));

            return next;
        });
    }, []);

    useFinanceQueryStream({
        symbols,
        wsUrl,
        onUpdate: handlePriceUpdate,
        enabled: symbols.length > 0,
    });

    const switchTo = (id: string) => {
        router.visit(`/watchlists?watchlist=${id}`, { preserveScroll: true });
    };

    const deleteActive = () => {
        if (
            !active ||
            !confirm(t('watchlist.delete_confirm', { name: active.name }))
        ) {
            return;
        }

        router.delete(`/watchlists/${active.id}`);
    };

    const atListLimit = watchlists.length >= limits.maxPerUser;

    return (
        <>
            <Head title={t('watchlist.title')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {watchlists.map((watchlist) => {
                            const count = flattenWatchlistItems(
                                watchlist.sections,
                            ).length;

                            return (
                                <Button
                                    key={watchlist.id}
                                    variant={
                                        watchlist.id === active?.id
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => switchTo(watchlist.id)}
                                >
                                    {watchlist.name}
                                    <Badge variant="secondary" className="ml-2">
                                        {count}
                                    </Badge>
                                </Button>
                            );
                        })}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            disabled={atListLimit}
                            title={
                                atListLimit
                                    ? t('watchlist.max_lists', {
                                          max: limits.maxPerUser,
                                      })
                                    : t('watchlist.create_hint')
                            }
                        >
                            <ListPlus className="mr-1 h-4 w-4" />
                            {t('watchlist.new')}
                        </Button>
                    </div>

                    {active && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRenameOpen(true)}
                            >
                                <Pencil className="mr-1 h-4 w-4" />
                                {t('watchlist.rename')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={deleteActive}
                            >
                                <Trash2 className="mr-1 h-4 w-4" />
                                {t('watchlist.delete')}
                            </Button>
                        </div>
                    )}
                </div>

                {!active && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                            <p className="text-sm text-muted-foreground">
                                {t('watchlist.no_watchlist')}
                            </p>
                            <Button onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" />
                                {t('watchlist.create_first')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {active && (
                    <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_520px]">
                        {items.length > 0 ? (
                            <WatchlistTradingChart
                                key={active.id}
                                items={items}
                                wsUrl={wsUrl}
                                positions={positions}
                                selectedSymbol={effectiveSelectedSymbol}
                                onSelectedSymbolChange={setSelectedSymbol}
                            />
                        ) : (
                            <Card>
                                <CardContent className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                                    {t('watchlist.no_symbol_chart')}
                                </CardContent>
                            </Card>
                        )}

                        <WatchlistPanel
                            key={watchlistPanelKey(active)}
                            watchlist={active}
                            prices={prices}
                            maxItems={limits.maxItems}
                            selectedSymbol={effectiveSelectedSymbol}
                            onSelectSymbol={setSelectedSymbol}
                        />
                    </div>
                )}

                <AiReportCard
                    report={aiWatchlistReport}
                    title={t('watchlist.ai_report_title')}
                />
            </div>

            <WatchlistFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            {active && (
                <WatchlistFormDialog
                    open={renameOpen}
                    onOpenChange={setRenameOpen}
                    watchlist={active}
                />
            )}
        </>
    );
}

function normalizeQuote(symbol: string, quote: RawQuote): PriceUpdate | null {
    const price = numeric(quote.regularMarketPrice) ?? numeric(quote.price);

    if (price === undefined) {
        return null;
    }

    return {
        id: symbol.toUpperCase(),
        price,
        change:
            numeric(quote.regularMarketChange) ?? numeric(quote.change) ?? 0,
        change_percent:
            numeric(quote.regularMarketChangePercent) ??
            numeric(quote.changePercent) ??
            0,
        open_price: numeric(quote.regularMarketOpen) ?? numeric(quote.open),
        previous_close:
            numeric(quote.regularMarketPreviousClose) ??
            numeric(quote.previousClose),
        currency:
            typeof quote.currency === 'string' ? quote.currency : undefined,
        exchange:
            typeof quote.exchange === 'string' ? quote.exchange : undefined,
    };
}

function numeric(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

function watchlistPanelKey(watchlist: Watchlist): string {
    const layout = watchlist.sections
        .map(
            (section) =>
                `${section.id}:${section.name}:${section.items
                    .map((item) => item.id)
                    .join(',')}`,
        )
        .join('|');

    return `${watchlist.id}:${layout}`;
}
