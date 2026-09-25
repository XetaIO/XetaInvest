import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import type { PriceTickDto } from '../../../bindings/PriceTickDto';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import type { WatchlistDto } from '../../../bindings/WatchlistDto';
import { ApiClientError, locoErrorMessage } from '../../../shared/api/client';
import { PageMeta } from '../../../shared/components/common/PageMeta';
import { Button } from '../../../shared/components/ui/button/Button';
import { cn } from '../../../shared/utils/twMerge';
import {
    addWatchlistItem,
    createWatchlist,
    createWatchlistSection,
    deleteWatchlist,
    deleteWatchlistItem,
    deleteWatchlistSection,
    reorderWatchlist,
    updateWatchlist,
    updateWatchlistSection,
    watchlistsQueryOptions,
    watchlistQuotesQueryOptions,
    WATCHLIST_QUERY_KEY,
    WATCHLIST_SUMMARY_KEY,
} from '../api/watchlists';
import { WatchlistFormModal } from '../components/WatchlistFormModal';
import { WatchlistPanel } from '../components/WatchlistPanel';
import { WatchlistTradingChart } from '../components/WatchlistTradingChart';
import { usePriceStream } from '../hooks/usePriceStream';
import { mergeTickIntoQuote } from '../lib/priceStream';

function flattenSymbols(watchlist: WatchlistDto | null): string[] {
    if (!watchlist) return [];
    return watchlist.sections.flatMap((section) =>
        section.items.map((item) => item.instrument.symbol.toUpperCase()),
    );
}

export function WatchlistPage() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedId = Number(searchParams.get('watchlist') || '0');
    const pageQuery = useQuery(
        watchlistsQueryOptions(Number.isFinite(requestedId) ? requestedId : 0),
    );
    const data = pageQuery.data;
    const watchlists = data?.watchlists ?? [];
    const active =
        watchlists.find(
            (list) => list.id === (data?.active_watchlist_id ?? requestedId),
        ) ??
        watchlists[0] ??
        null;
    const symbols = useMemo(() => flattenSymbols(active), [active]);
    const [selectedSymbol, setSelectedSymbol] = useState('');
    const effectiveSymbol = symbols.includes(selectedSymbol)
        ? selectedSymbol
        : (symbols[0] ?? '');

    const items = useMemo(
        () => active?.sections.flatMap((section) => section.items) ?? [],
        [active],
    );
    const snapshotQuery = useQuery(watchlistQuotesQueryOptions(symbols));
    const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteDto>>({});
    const snapshotRef = useRef(snapshotQuery.data?.quotes);
    snapshotRef.current = snapshotQuery.data?.quotes;
    const quotes = useMemo(
        () => ({ ...snapshotQuery.data?.quotes, ...liveQuotes }),
        [snapshotQuery.data?.quotes, liveQuotes],
    );

    const onTick = useCallback((tick: PriceTickDto) => {
        const symbol = tick.id.toUpperCase();
        setLiveQuotes((current) => ({
            ...current,
            [symbol]: mergeTickIntoQuote(
                current[symbol] ?? snapshotRef.current?.[symbol],
                tick,
            ),
        }));
    }, []);

    useEffect(() => {
        setLiveQuotes({});
    }, [active?.id]);

    usePriceStream({
        symbols,
        onUpdate: onTick,
        enabled: symbols.length > 0,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const atListLimit = watchlists.length >= (data?.limits.max_per_user ?? 10);

    const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: WATCHLIST_SUMMARY_KEY });
    };

    const createMutation = useMutation({
        mutationFn: (name: string) => createWatchlist({ name }),
        onSuccess: (payload) => {
            invalidate();
            const id = payload.active_watchlist_id;
            if (id) setSearchParams({ watchlist: String(id) });
            setCreateOpen(false);
        },
    });
    const renameMutation = useMutation({
        mutationFn: (name: string) => updateWatchlist(active!.id, { name }),
        onSuccess: () => {
            invalidate();
            setRenameOpen(false);
        },
    });
    const deleteMutation = useMutation({
        mutationFn: () => deleteWatchlist(active!.id),
        onSuccess: () => {
            invalidate();
            setSearchParams({});
        },
    });

    const busy =
        createMutation.isPending ||
        renameMutation.isPending ||
        deleteMutation.isPending ||
        pageQuery.isFetching;

    function errorMessage(error: unknown): string {
        if (error instanceof ApiClientError || error instanceof Error) {
            return locoErrorMessage(error);
        }
        return t('watchlist.item_status_error');
    }

    return (
        <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col gap-4">
            <PageMeta
                title={t('watchlist.title')}
                description={t('watchlist.title')}
            />
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {watchlists.map((list) => {
                        const count = list.sections.reduce(
                            (sum, section) => sum + section.items.length,
                            0,
                        );
                        return (
                            <Button
                                key={list.id}
                                type="button"
                                size="sm"
                                variant={
                                    active?.id === list.id
                                        ? 'primary'
                                        : 'outline'
                                }
                                className="h-9 py-0"
                                onClick={() =>
                                    setSearchParams({
                                        watchlist: String(list.id),
                                    })
                                }
                            >
                                {list.name}
                                <span
                                    className={cn(
                                        'ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                                        active?.id === list.id
                                            ? 'bg-black/10 text-black'
                                            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70',
                                    )}
                                >
                                    {count}
                                </span>
                            </Button>
                        );
                    })}
                    <span
                        title={
                            atListLimit
                                ? t('watchlist.max_lists', {
                                      max: data?.limits.max_per_user,
                                  })
                                : t('watchlist.create_hint')
                        }
                    >
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 py-0"
                            disabled={atListLimit}
                            onClick={() => {
                                setFormError(null);
                                setCreateOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            {t('watchlist.new')}
                        </Button>
                    </span>
                </div>
                {active && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 py-0"
                            onClick={() => {
                                setFormError(null);
                                setRenameOpen(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                            {t('watchlist.rename')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-9 py-0"
                            isLoading={deleteMutation.isPending}
                            onClick={() => {
                                if (
                                    window.confirm(
                                        t('watchlist.delete_confirm', {
                                            name: active.name,
                                        }),
                                    )
                                ) {
                                    deleteMutation.mutate();
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('watchlist.delete')}
                        </Button>
                    </div>
                )}
            </div>

            {atListLimit && (
                <p className="text-xs text-amber-600">
                    {t('watchlist.max_lists', {
                        max: data?.limits.max_per_user,
                    })}
                </p>
            )}
            {pageQuery.isError && (
                <p className="text-sm text-rose-600">
                    {errorMessage(pageQuery.error)}
                </p>
            )}
            {pageQuery.isLoading && (
                <p className="text-sm text-gray-500 dark:text-white/50">
                    {t('common.loading')}
                </p>
            )}

            {!active && !pageQuery.isLoading && (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-gray-300 p-8 dark:border-white/15">
                    <ListPlus className="h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600 dark:text-white/70">
                        {t('watchlist.no_watchlist')}
                    </p>
                    <Button
                        size="sm"
                        onClick={() => {
                            setFormError(null);
                            setCreateOpen(true);
                        }}
                    >
                        {t('watchlist.create_first')}
                    </Button>
                </div>
            )}

            {active && (
                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 2xl:h-[calc(100dvh-12rem)] 2xl:min-h-128 2xl:grid-cols-[minmax(0,1fr)_520px]">
                    {items.length > 0 ? (
                        <WatchlistTradingChart
                            key={active.id}
                            items={items}
                            selectedSymbol={effectiveSymbol}
                            positions={data?.positions ?? {}}
                            quotes={quotes}
                        />
                    ) : (
                        <section className="flex min-h-96 items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 xl:h-full dark:border-white/10 dark:bg-white/3">
                            <p className="text-sm text-gray-500 dark:text-white/50">
                                {t('watchlist.no_symbol_chart')}
                            </p>
                        </section>
                    )}
                    <WatchlistPanel
                        watchlist={active}
                        quotes={quotes}
                        maxItems={data?.limits.max_items ?? 25}
                        selectedSymbol={effectiveSymbol}
                        onSelectSymbol={setSelectedSymbol}
                        isBusy={busy}
                        onCreateSection={async (name) => {
                            await createWatchlistSection(active.id, { name });
                            invalidate();
                        }}
                        onRenameSection={async (id, name) => {
                            await updateWatchlistSection(id, { name });
                            invalidate();
                        }}
                        onDeleteSection={async (id, name) => {
                            if (
                                !window.confirm(
                                    t('watchlist.section_delete_confirm', {
                                        name,
                                    }),
                                )
                            )
                                return;
                            await deleteWatchlistSection(id);
                            invalidate();
                        }}
                        onAddItem={async (sectionId, symbol) => {
                            await addWatchlistItem(active.id, {
                                symbol,
                                section_id: sectionId,
                            });
                            invalidate();
                        }}
                        onRemoveItem={async (itemId, symbol) => {
                            if (
                                !window.confirm(
                                    t('watchlist.remove_confirm', { symbol }),
                                )
                            )
                                return;
                            await deleteWatchlistItem(itemId);
                            invalidate();
                        }}
                        onReorder={async (sections) => {
                            await reorderWatchlist(active.id, { sections });
                            invalidate();
                        }}
                    />
                </div>
            )}

            <WatchlistFormModal
                open={createOpen}
                title={t('watchlist.new_title')}
                isSubmitting={createMutation.isPending}
                error={
                    formError ??
                    (createMutation.error
                        ? locoErrorMessage(createMutation.error)
                        : null)
                }
                onClose={() => setCreateOpen(false)}
                onSubmit={(name) => {
                    setFormError(null);
                    createMutation.mutate(name);
                }}
            />
            <WatchlistFormModal
                open={renameOpen}
                title={t('watchlist.rename_title')}
                initialName={active?.name ?? ''}
                isSubmitting={renameMutation.isPending}
                error={
                    formError ??
                    (renameMutation.error
                        ? locoErrorMessage(renameMutation.error)
                        : null)
                }
                onClose={() => setRenameOpen(false)}
                onSubmit={(name) => {
                    setFormError(null);
                    renameMutation.mutate(name);
                }}
            />
        </div>
    );
}
