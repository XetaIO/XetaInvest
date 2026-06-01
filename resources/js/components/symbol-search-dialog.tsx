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
import { AddToWatchlistButton } from '@/components/watchlist/add-to-watchlist-button';
import type { SymbolSearchResult } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function SymbolSearchDialog({ open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SymbolSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        const q = query.trim();

        if (q.length < 2) {
            return;
        }

        const timeout = window.setTimeout(async () => {
            setLoading(true);

            try {
                const response = await fetch(`/symbol-search?q=${encodeURIComponent(q)}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!response.ok) {
                    throw new Error('Search request failed');
                }

                const payload = (await response.json()) as { data?: SymbolSearchResult[] };
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
        }

        onOpenChange(next);
    };

    const trimmed = query.trim();
    const displayResults = trimmed.length < 2 ? [] : results;

    const goToSymbol = useCallback(
        (symbol: string) => {
            onOpenChange(false);
            router.visit(`/symbol/${encodeURIComponent(symbol)}`);
        },
        [onOpenChange],
    );

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && displayResults[0]) {
            event.preventDefault();
            goToSymbol(displayResults[0].symbol);
        }
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
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className="max-h-90 overflow-y-auto border-t">
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

                    {!loading && trimmed.length >= 2 && displayResults.length === 0 && (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            {t('symbol.search_no_results')}
                        </p>
                    )}

                    {!loading && displayResults.length > 0 && (
                        <ul className="py-1">
                            {displayResults.map((r) => (
                                <li key={`${r.symbol}-${r.exchange ?? ''}`}>
                                    <div className="flex w-full items-start gap-2 px-4 py-2.5 hover:bg-accent">
                                        <button
                                            type="button"
                                            onClick={() => goToSymbol(r.symbol)}
                                            className="flex flex-1 items-start gap-3 text-left focus:outline-none"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{r.symbol}</span>
                                                    {r.type && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {r.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {r.name && (
                                                    <p className="text-xs text-muted-foreground">{r.name}</p>
                                                )}
                                            </div>
                                            {r.exchange && (
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {r.exchange}
                                                </span>
                                            )}
                                        </button>
                                        <AddToWatchlistButton
                                            symbol={r.symbol}
                                            variant="ghost"
                                            size="sm"
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
