import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../shared/components/form/input/InputField';
import { Button } from '../../../shared/components/ui/button/Button';
import { symbolSearchOptions } from '../../GlobalSearch/api/symbolSearch';
import { MIN_SEARCH_LENGTH } from '../../GlobalSearch/types';

export function ComparisonSearch({
    excludedSymbols,
    onAdd,
}: {
    excludedSymbols: string[];
    onAdd: (symbol: string) => void;
}) {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const region = (i18n.resolvedLanguage || i18n.language).startsWith('fr')
        ? 'FR'
        : 'US';

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(query.trim()), 380);
        return () => window.clearTimeout(timer);
    }, [query]);

    const search = useQuery({
        ...symbolSearchOptions({ q: debounced, region }),
        enabled: open && debounced.length >= MIN_SEARCH_LENGTH,
    });
    const results = (search.data ?? []).filter(
        (result) => !excludedSymbols.includes(result.symbol.toUpperCase()),
    );

    const add = (symbol: string) => {
        onAdd(symbol.toUpperCase());
        setQuery('');
        setOpen(false);
    };

    return (
        <div className="relative">
            {open ? (
                <div className="relative">
                    <Search className="pointer-events-none absolute top-3.5 left-2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onBlur={() =>
                            window.setTimeout(() => setOpen(false), 150)
                        }
                        className="h-8 w-48 py-1 pr-7 pl-7 text-xs"
                        placeholder={t('watchlist.compare_placeholder')}
                        autoFocus
                    />
                    {search.isFetching && (
                        <Loader2 className="absolute top-3.5 right-2 h-3.5 w-3.5 animate-spin text-gray-400" />
                    )}
                    {debounced.length >= MIN_SEARCH_LENGTH &&
                        results.length > 0 && (
                            <div className="absolute top-9 left-0 z-50 max-h-64 w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-md dark:border-white/10 dark:bg-mist-950">
                                {results.map((result) => (
                                    <button
                                        key={`${result.symbol}-${result.exchange}`}
                                        type="button"
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={() => add(result.symbol)}
                                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                                    >
                                        <span>
                                            <strong>{result.symbol}</strong>
                                            {result.name && (
                                                <span className="ml-2 text-gray-500 dark:text-white/50">
                                                    {result.name}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-gray-400">
                                            {result.exchange}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                </div>
            ) : (
                <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-7 gap-1 px-2 py-0 text-xs"
                    onClick={() => setOpen(true)}
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t('watchlist.compare_btn')}
                </Button>
            )}
        </div>
    );
}
