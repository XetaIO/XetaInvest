import { router } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import type { SymbolSearchResult } from '@/types/symbol';
import type { WatchlistSection } from '@/types/watchlist';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    watchlistId: string;
    section: WatchlistSection | null;
};

export function WatchlistSymbolDialog({
    open,
    onOpenChange,
    watchlistId,
    section,
}: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SymbolSearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const trimmed = query.trim();

        if (trimmed.length < 2) {
            return;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setLoading(true);

            try {
                const payload = await apiFetch<{
                    data?: SymbolSearchResult[];
                }>(`/symbol-search?q=${encodeURIComponent(trimmed)}`, {
                    signal: controller.signal,
                });
                setResults(payload.data ?? []);
            } catch {
                if (!controller.signal.aborted) {
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [open, query]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setQuery('');
            setResults([]);
            setLoading(false);
        }

        onOpenChange(next);
    };

    const addSymbol = (symbol: string) => {
        if (!section) {
            return;
        }

        router.post(
            `/watchlists/${watchlistId}/items`,
            { symbol, section_id: section.id },
            {
                preserveScroll: true,
                onSuccess: () => handleOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg p-0">
                <DialogHeader className="border-b px-4 py-3">
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Search className="h-4 w-4" />
                        {t('watchlist.add_to_section', {
                            section: section?.name ?? '',
                        })}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t('symbol.search_description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="px-4 py-3">
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('watchlist.add_placeholder')}
                        autoFocus
                    />
                </div>
                <div className="max-h-96 overflow-y-auto border-t">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('symbol.search_loading')}
                        </div>
                    )}
                    {!loading && query.trim().length < 2 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t('symbol.search_min_chars')}
                        </p>
                    )}
                    {!loading &&
                        query.trim().length >= 2 &&
                        results.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('symbol.search_no_results')}
                            </p>
                        )}
                    {!loading &&
                        query.trim().length >= 2 &&
                        results.length > 0 && (
                            <ul>
                                {results.map((result) => (
                                    <li
                                        key={`${result.symbol}-${result.exchange}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                addSymbol(
                                                    result.symbol.toUpperCase(),
                                                )
                                            }
                                            className="flex w-full items-center justify-between gap-3 border-b px-4 py-2 text-left last:border-b-0 hover:bg-accent"
                                        >
                                            <span className="min-w-0">
                                                <span className="font-medium">
                                                    {result.symbol}
                                                </span>
                                                {result.name && (
                                                    <span className="ml-2 truncate text-xs text-muted-foreground">
                                                        {result.name}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {result.exchange}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
