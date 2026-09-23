import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WatchlistSectionDto } from '../../../bindings/WatchlistSectionDto';
import { Input } from '../../../shared/components/form/input/InputField';
import { Modal } from '../../../shared/components/ui/modal/Modal';
import { symbolSearchOptions } from '../../GlobalSearch/api/symbolSearch';
import { MIN_SEARCH_LENGTH } from '../../GlobalSearch/types';

type Props = {
    open: boolean;
    section: WatchlistSectionDto | null;
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
    onAdd: (sectionId: number, symbol: string) => Promise<void>;
};

/**
 * Search dialog used to add a ticker to one watchlist section
 * (Laravel `WatchlistSymbolDialog`).
 */
export function WatchlistSymbolDialog({
    open,
    section,
    isSubmitting,
    error,
    onClose,
    onAdd,
}: Props) {
    const { t, i18n } = useTranslation();
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const region = (i18n.resolvedLanguage || i18n.language).startsWith('fr')
        ? 'FR'
        : 'US';

    useEffect(() => {
        if (!open) {
            setQuery('');
            setDebounced('');
        }
    }, [open]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [query]);

    const search = useQuery({
        ...symbolSearchOptions({ q: debounced, region }),
        enabled: open && debounced.length >= MIN_SEARCH_LENGTH,
    });
    const results = search.data ?? [];

    async function addSymbol(symbol: string) {
        if (!section) {
            return;
        }
        await onAdd(section.id, symbol.toUpperCase());
    }

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            className="max-w-lg overflow-hidden p-0"
        >
            <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
                <h2 className="flex items-center gap-2 pr-10 text-base font-semibold text-gray-900 dark:text-white">
                    <Search className="h-4 w-4" />
                    {t('watchlist.add_to_section', {
                        section: section?.name ?? '',
                    })}
                </h2>
            </div>
            <div className="px-4 py-3">
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('watchlist.add_placeholder')}
                    autoFocus
                />
                {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
            </div>
            <div className="max-h-96 overflow-y-auto border-t border-gray-200 dark:border-white/10">
                {search.isFetching && (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-white/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('watchlist.search_loading')}
                    </div>
                )}
                {!search.isFetching &&
                    query.trim().length < MIN_SEARCH_LENGTH && (
                        <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">
                            {t('watchlist.search_min_chars')}
                        </p>
                    )}
                {!search.isFetching &&
                    query.trim().length >= MIN_SEARCH_LENGTH &&
                    results.length === 0 && (
                        <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">
                            {t('watchlist.search_no_results')}
                        </p>
                    )}
                {!search.isFetching && results.length > 0 && (
                    <ul>
                        {results.map((result) => (
                            <li key={`${result.symbol}-${result.exchange}`}>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() =>
                                        void addSymbol(result.symbol)
                                    }
                                    className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-left last:border-b-0 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                                >
                                    <span className="min-w-0">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {result.symbol}
                                        </span>
                                        {result.name && (
                                            <span className="ml-2 truncate text-xs text-gray-500 dark:text-white/50">
                                                {result.name}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 text-xs text-gray-400">
                                        {result.exchange}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
