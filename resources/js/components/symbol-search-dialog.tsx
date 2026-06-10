import { router } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddToWatchlistButton } from '@/components/watchlist/add-to-watchlist-button';
import { apiFetch } from '@/lib/api';
import { TAB_ORDER } from '@/lib/constants';
import type { SymbolSearchResult } from '@/types/symbol';
import { search as symbolSearch, show as symbolShow } from '@/routes/symbol';

type QuoteType = (typeof TAB_ORDER)[number];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function SymbolLogo({
    logoUrl,
    symbol,
}: {
    logoUrl: string | null;
    symbol: string;
}) {
    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={symbol}
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded object-contain"
            />
        );
    }

    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
            {symbol.slice(0, 2).toUpperCase()}
        </span>
    );
}

function ResultItem({
    result,
    onNavigate,
}: {
    result: SymbolSearchResult;
    onNavigate: (symbol: string) => void;
}) {
    return (
        <li>
            <div className="flex w-full items-center gap-2 px-4 py-2 hover:bg-accent">
                <button
                    type="button"
                    onClick={() => onNavigate(result.symbol)}
                    className="flex flex-1 items-center gap-3 text-left focus:outline-none"
                >
                    <SymbolLogo
                        logoUrl={result.logo_url}
                        symbol={result.symbol}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{result.symbol}</span>
                            {result.type && (
                                <Badge variant="secondary" className="text-xs">
                                    {result.type}
                                </Badge>
                            )}
                        </div>
                        {result.name && (
                            <p className="truncate text-xs text-muted-foreground">
                                {result.name}
                            </p>
                        )}
                    </div>
                    {result.exchange && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                            {result.exchange}
                        </span>
                    )}
                </button>
                <AddToWatchlistButton
                    symbol={result.symbol}
                    variant="ghost"
                    size="sm"
                />
            </div>
        </li>
    );
}

export function SymbolSearchDialog({ open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SymbolSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const debounceRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        const q = query.trim();

        const timeout = window.setTimeout(async () => {
            setLoading(true);

            try {
                const payload = await apiFetch<{ data?: SymbolSearchResult[] }>(
                    `${symbolSearch().url}?q=${encodeURIComponent(q)}`,
                );
                setResults(payload.data ?? []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        debounceRef.current = timeout;

        return () => {
            window.clearTimeout(timeout);
        };
    }, [query]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setQuery('');
            setResults([]);
            setLoading(false);
            setActiveTab('all');
        }

        onOpenChange(next);
    };

    const trimmed = query.trim();
    const displayResults = trimmed.length < 2 ? [] : results;

    // Build tab list: only types that appear in results
    const presentTypes = TAB_ORDER.filter((type) =>
        displayResults.some((r) => r.type?.toLowerCase() === type),
    ) as QuoteType[];

    const tabs = presentTypes.length > 0 ? ['all', ...presentTypes] : ['all'];

    // Filter results for active tab
    const filteredResults =
        activeTab === 'all'
            ? displayResults
            : displayResults.filter((r) => r.type?.toLowerCase() === activeTab);

    const goToSymbol = useCallback(
        (symbol: string) => {
            onOpenChange(false);
            router.visit(symbolShow(symbol).url);
        },
        [onOpenChange],
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && filteredResults[0]) {
            event.preventDefault();
            goToSymbol(filteredResults[0].symbol);
        }
    };

    const tabLabel = (tab: string) => {
        if (tab === 'all') {
            return t('symbol.search_tab_all');
        }

        const key = `symbol.search_tab_${tab}` as const;

        return t(key);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-xl p-0">
                <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        {t('symbol.search_title')}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t('symbol.search_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-3">
                    <Input
                        autoFocus
                        placeholder="AAPL, Apple, Tesla..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveTab('all');
                        }}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="max-h-[70vh] overflow-y-auto border-t">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('symbol.search_loading')}
                        </div>
                    )}

                    {!loading && trimmed.length < 2 && (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            {t('symbol.search_min_chars')}
                        </p>
                    )}

                    {!loading &&
                        trimmed.length >= 2 &&
                        displayResults.length === 0 && (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                                {t('symbol.search_no_results')}
                            </p>
                        )}

                    {!loading && displayResults.length > 0 && (
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            {tabs.length > 1 && (
                                <TabsList className="mx-4 mt-2 h-8 w-auto justify-start gap-1 rounded-md bg-muted/50 p-1">
                                    {tabs.map((tab) => (
                                        <TabsTrigger
                                            key={tab}
                                            value={tab}
                                            className="h-6 px-2.5 text-xs"
                                        >
                                            {tabLabel(tab)}
                                            {tab !== 'all' && (
                                                <span className="ml-1 text-[10px] text-muted-foreground">
                                                    (
                                                    {
                                                        displayResults.filter(
                                                            (r) =>
                                                                r.type?.toLowerCase() ===
                                                                tab,
                                                        ).length
                                                    }
                                                    )
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            )}

                            {tabs.map((tab) => (
                                <TabsContent
                                    key={tab}
                                    value={tab}
                                    className="mt-0"
                                >
                                    <ul className="py-1">
                                        {(tab === 'all'
                                            ? displayResults
                                            : displayResults.filter(
                                                  (r) =>
                                                      r.type?.toLowerCase() ===
                                                      tab,
                                              )
                                        ).map((r) => (
                                            <ResultItem
                                                key={`${r.symbol}-${r.exchange ?? ''}`}
                                                result={r}
                                                onNavigate={goToSymbol}
                                            />
                                        ))}
                                    </ul>
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
