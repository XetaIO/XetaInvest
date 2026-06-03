import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import { ListPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiReportCard } from '@/components/ai/ai-report-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WatchlistChart } from '@/components/watchlist/watchlist-chart';
import type { ChartSeries } from '@/components/watchlist/watchlist-chart';
import { WatchlistFormDialog } from '@/components/watchlist/watchlist-form-dialog';
import { WatchlistRow } from '@/components/watchlist/watchlist-row';
import { useFinanceQueryStream } from '@/hooks/use-finance-query-stream';
import type { AiReport, PriceUpdate, Watchlist, WatchlistLimits } from '@/types';

type SharedExtra = { financeQueryWsUrl?: string };

type PageProps = {
    watchlists: Watchlist[];
    activeWatchlistId: string | null;
    limits: WatchlistLimits;
    aiWatchlistReport?: AiReport | null;
};

const PALETTE = [
    '#0ea5e9',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
];

const MAX_POINTS = 600;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type LivePoint = { t: number; v: number };

export default function WatchlistPage({ watchlists, activeWatchlistId, limits, aiWatchlistReport = null }: PageProps) {
    const { t } = useTranslation();
    setLayoutProps({ breadcrumbs: [{ title: t('watchlist.title'), href: '/watchlists' }] });
    const page = usePage<{ financeQueryWsUrl?: string } & SharedExtra>();
    const wsUrl = page.props.financeQueryWsUrl ?? '';

    const [createOpen, setCreateOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [addSymbol, setAddSymbol] = useState('');
    const [compareSymbol, setCompareSymbol] = useState('');
    const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
    const [hidden, setHidden] = useState<Set<string>>(new Set());

    const prices = useRef<Map<string, PriceUpdate>>(new Map());
    const history = useRef<Map<string, LivePoint[]>>(new Map());
    const [tick, setTick] = useState(0);

    const active = useMemo(
        () => watchlists.find((w) => w.id === activeWatchlistId) ?? null,
        [watchlists, activeWatchlistId],
    );

    const itemSymbols = useMemo(
        () => (active?.items ?? []).map((i) => i.instrument.symbol.toUpperCase()),
        [active],
    );

    const allSymbols = useMemo(
        () => Array.from(new Set([...itemSymbols, ...compareSymbols.map((s) => s.toUpperCase())])),
        [itemSymbols, compareSymbols],
    );

    const handleUpdate = useCallback((u: PriceUpdate) => {
        const sym = u.id.toUpperCase();
        prices.current.set(sym, u);

        const t = u.time ? Date.parse(u.time) : Date.now();
        const list = history.current.get(sym) ?? [];
        const last = list[list.length - 1];

        if (!last || last.t !== t) {
            list.push({ t, v: u.price });

            if (list.length > MAX_POINTS) {
                list.shift();
            }

            history.current.set(sym, list);
        } else {
            last.v = u.price;
        }

        setTick((n) => (n + 1) % 1_000_000);
    }, []);

    useFinanceQueryStream({
        symbols: allSymbols,
        wsUrl,
        onUpdate: handleUpdate,
        enabled: allSymbols.length > 0,
    });

    useEffect(() => {
        // Drop history entries that are no longer subscribed
        for (const key of Array.from(history.current.keys())) {
            if (!allSymbols.includes(key)) {
                history.current.delete(key);
                prices.current.delete(key);
            }
        }
    }, [allSymbols]);

    useEffect(() => {
        // Seed history with recent baseline so the chart isn't empty when markets are closed
        const missing = allSymbols.filter((s) => !history.current.has(s));

        if (missing.length === 0) {
            return;
        }

        let cancelled = false;
        const url = `/api/watchlists/history?symbols=${encodeURIComponent(missing.join(','))}`;

        fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then((r) => (r.ok ? r.json() : null))
            .then((payload: { data?: Record<string, LivePoint[]> } | null) => {
                if (cancelled || !payload?.data) {
                    return;
                }

                for (const [sym, points] of Object.entries(payload.data)) {
                    if (!history.current.has(sym) && Array.isArray(points) && points.length > 0) {
                        history.current.set(sym, points.slice(-MAX_POINTS));
                    }
                }

                setTick((n) => (n + 1) % 1_000_000);
            })
            .catch(() => {
                /* ignore */
            });

        return () => {
            cancelled = true;
        };
    }, [allSymbols]);

    const colorFor = useCallback(
        (symbol: string) => {
            const idx = allSymbols.indexOf(symbol.toUpperCase());

            return PALETTE[Math.max(0, idx) % PALETTE.length];
        },
        [allSymbols],
    );

    const switchTo = (id: string) => {
        router.visit(`/watchlists?watchlist=${id}`, { preserveScroll: true });
    };

    const submitAdd = (e: React.FormEvent) => {
        e.preventDefault();

        if (!active || !addSymbol.trim()) {
            return;
        }

        router.post(
            `/watchlists/${active.id}/items`,
            { symbol: addSymbol.trim().toUpperCase() },
            {
                preserveScroll: true,
                onSuccess: () => setAddSymbol(''),
            },
        );
    };

    const addCompare = (e: React.FormEvent) => {
        e.preventDefault();
        const s = compareSymbol.trim().toUpperCase();

        if (!s) {
            return;
        }

        if (compareSymbols.includes(s)) {
            return;
        }

        if (itemSymbols.includes(s)) {
            return;
        }

        setCompareSymbols((prev) => [...prev, s]);
        setCompareSymbol('');
    };

    const removeCompare = (s: string) => {
        setCompareSymbols((prev) => prev.filter((x) => x !== s));
    };

    const toggleHidden = (sym: string) => {
        setHidden((prev) => {
            const next = new Set(prev);

            if (next.has(sym)) {
                next.delete(sym);
            } else {
                next.add(sym);
            }

            return next;
        });
    };

    const deleteActive = () => {
        if (!active) {
            return;
        }

        if (!confirm(t('watchlist.delete_confirm', { name: active.name }))) {
            return;
        }

        router.delete(`/watchlists/${active.id}`, { preserveScroll: false });
    };

    const series: ChartSeries[] = useMemo(() => {
        // suppress unused tick warning – `tick` triggers re-render
        void tick;

        // eslint-disable-next-line react-hooks/purity
        const cutoff = Date.now() - MAX_AGE_MS;
        const symbols = allSymbols.filter((s) => !hidden.has(s));

        // eslint-disable-next-line react-hooks/refs
        return symbols.map((sym) => ({
            symbol: sym,
            color: colorFor(sym),
            // eslint-disable-next-line react-hooks/refs
            points: (history.current.get(sym) ?? []).filter((p) => p.t >= cutoff),
        }));
    }, [allSymbols, hidden, colorFor, tick]);

    const atListLimit = watchlists.length >= limits.maxPerUser;
    const atItemLimit = active ? active.items.length >= limits.maxItems : false;

    return (
        <>
            <Head title={t('watchlist.title')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {watchlists.map((w) => (
                            <Button
                                key={w.id}
                                variant={w.id === active?.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => switchTo(w.id)}
                            >
                                {w.name}
                                <Badge variant="secondary" className="ml-2">
                                    {w.items.length}
                                </Badge>
                            </Button>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            disabled={atListLimit}
                            title={atListLimit ? t('watchlist.max_lists', { max: limits.maxPerUser }) : t('watchlist.create_hint')}
                        >
                            <ListPlus className="mr-1 h-4 w-4" /> {t('watchlist.new')}
                        </Button>
                    </div>

                    {active && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
                                <Pencil className="mr-1 h-4 w-4" /> {t('watchlist.rename')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={deleteActive}>
                                <Trash2 className="mr-1 h-4 w-4" /> {t('watchlist.delete')}
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
                                <Plus className="mr-1 h-4 w-4" /> {t('watchlist.create_first')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {active && (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
                        <Card className="py-6">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base">{t('watchlist.evolution_title')}</CardTitle>
                                <span className="text-xs text-muted-foreground">{t('watchlist.realtime')}</span>
                            </CardHeader>
                            <CardContent>
                                <WatchlistChart series={series} />

                                <form onSubmit={addCompare} className="mt-4 flex items-center gap-2">
                                    <Input
                                        value={compareSymbol}
                                        onChange={(e) => setCompareSymbol(e.target.value)}
                                        placeholder={t('watchlist.compare_placeholder')}
                                        className="max-w-xs"
                                    />
                                    <Button type="submit" variant="outline" size="sm">
                                        <Plus className="mr-1 h-4 w-4" /> {t('watchlist.compare_btn')}
                                    </Button>
                                </form>

                                {compareSymbols.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {compareSymbols.map((s) => (
                                            <Badge
                                                key={s}
                                                variant="secondary"
                                                className="flex items-center gap-1"
                                                style={{ borderColor: colorFor(s), borderWidth: 1 }}
                                            >
                                                {s}
                                                <button
                                                    type="button"
                                                    onClick={() => removeCompare(s)}
                                                    className="ml-1 hover:text-rose-500"
                                                    aria-label={t('watchlist.remove_symbol', { symbol: s })}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="py-6">
                            <CardHeader className="space-y-2 pb-3">
                                <CardTitle className="text-base">
                                    {active.name}
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {active.items.length} / {limits.maxItems}
                                    </span>
                                </CardTitle>
                                <form onSubmit={submitAdd} className="flex items-center gap-2">
                                    <Input
                                        value={addSymbol}
                                        onChange={(e) => setAddSymbol(e.target.value)}
                                        placeholder={t('watchlist.add_placeholder')}
                                        disabled={atItemLimit}
                                    />
                                    <Button type="submit" size="sm" disabled={atItemLimit || !addSymbol.trim()}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </form>
                                {atItemLimit && (
                                    <p className="text-xs text-amber-500">
                                        {t('watchlist.item_limit', { max: limits.maxItems })}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                {active.items.length === 0 ? (
                                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                        {t('watchlist.no_symbol_add')}
                                    </p>
                                ) : (
                                    <ul>
                                        {/* eslint-disable-next-line react-hooks/refs */}
                                        {active.items.map((item) => {
                                            const sym = item.instrument.symbol.toUpperCase();

                                            return (
                                                <WatchlistRow
                                                    key={item.id}
                                                    item={item}

                                                    price={prices.current.get(sym) ?? null}
                                                    visible={!hidden.has(sym)}
                                                    color={colorFor(sym)}
                                                    onToggleVisible={() => toggleHidden(sym)}
                                                />
                                            );
                                        })}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                <AiReportCard report={aiWatchlistReport} title="Analyse IA — watchlists" />
            </div>

            <WatchlistFormDialog open={createOpen} onOpenChange={setCreateOpen} />
            {active && (
                <WatchlistFormDialog open={renameOpen} onOpenChange={setRenameOpen} watchlist={active} />
            )}
        </>
    );
}
