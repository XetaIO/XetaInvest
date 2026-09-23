import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SymbolLogo } from '../../../shared/utils/symbol';
import {
    normalizeSearchParams,
    symbolSearchOptions,
} from '../api/symbolSearch';
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from '../types';
import type { SearchTab, SymbolSearchResult } from '../types';
import { getAvailableSymbolTypes } from '../utils/symbolFilters';

export interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    /** Override navigation when embedding the search in another feature. */
    onSelect?: (result: SymbolSearchResult) => void;
}

function SearchDialog({
    onClose,
    onSelect,
}: Omit<GlobalSearchProps, 'isOpen'>) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const id = useId();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('all');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const region = (i18n.resolvedLanguage || i18n.language).startsWith('fr')
        ? 'FR'
        : 'US';
    const searchParams = normalizeSearchParams({ q: query, region });
    const trimmedQuery = searchParams.q;

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedQuery(trimmedQuery),
            250,
        );
        return () => window.clearTimeout(timer);
    }, [trimmedQuery]);

    // Changing the key immediately detaches and cancels the previous request.
    // The next request starts only after the current input has settled.
    const searchOptions = symbolSearchOptions(searchParams);
    const search = useQuery({
        ...searchOptions,
        enabled: searchOptions.enabled && trimmedQuery === debouncedQuery,
    });

    const results = search.data ?? [];
    const availableTypes = getAvailableSymbolTypes(results);
    const effectiveTab =
        activeTab === 'all' || availableTypes.includes(activeTab)
            ? activeTab
            : 'all';
    const filteredResults =
        effectiveTab === 'all'
            ? results
            : results.filter(
                  (result) => result.type?.toLowerCase() === effectiveTab,
              );
    const activeIndex = Math.min(
        selectedIndex,
        Math.max(0, filteredResults.length - 1),
    );
    const isLoading =
        trimmedQuery.length >= MIN_SEARCH_LENGTH &&
        (trimmedQuery !== debouncedQuery || search.isFetching);
    const showResults =
        !isLoading &&
        !search.isError &&
        trimmedQuery.length >= MIN_SEARCH_LENGTH;

    useEffect(() => {
        const previousFocus =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        inputRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, []);

    useEffect(() => {
        resultsRef.current
            ?.querySelector<HTMLElement>('[data-index="' + activeIndex + '"]')
            ?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex, effectiveTab, search.data]);

    function selectResult(result: SymbolSearchResult) {
        onClose();
        if (onSelect) onSelect(result);
        else void navigate('/symbol/' + encodeURIComponent(result.symbol));
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
        } else if (event.key === 'Tab') {
            const focusable = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                    'button:not([disabled]):not([tabindex="-1"]), input, [href], [tabindex="0"]',
                ) ?? [],
            );
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        } else if (
            event.target === inputRef.current &&
            showResults &&
            filteredResults.length > 0
        ) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex(
                    (activeIndex +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        filteredResults.length) %
                        filteredResults.length,
                );
            } else if (event.key === 'Enter') {
                event.preventDefault();
                selectResult(filteredResults[activeIndex]);
            }
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-100000 flex items-start justify-center px-4 pt-[10vh]">
            <div
                className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
                aria-hidden="true"
                onClick={onClose}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={id + '-title'}
                aria-describedby={id + '-description'}
                onKeyDown={handleKeyDown}
                className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/5 dark:bg-[#050806]/90"
            >
                <h2 id={id + '-title'} className="sr-only">
                    {t('search.title')}
                </h2>
                <p id={id + '-description'} className="sr-only">
                    {t('search.searchHint')}
                </p>
                <div className="flex items-center border-b border-gray-200 px-4 dark:border-white/5">
                    <Search
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-gray-400"
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        autoComplete="off"
                        aria-label={t('search.placeholder')}
                        aria-autocomplete="list"
                        aria-expanded={
                            showResults && filteredResults.length > 0
                        }
                        aria-controls={id + '-results'}
                        aria-activedescendant={
                            showResults && filteredResults[activeIndex]
                                ? id + '-option-' + activeIndex
                                : undefined
                        }
                        maxLength={MAX_SEARCH_LENGTH}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveTab('all');
                            setSelectedIndex(0);
                        }}
                        placeholder={t('search.placeholder')}
                        className="w-full border-0 bg-transparent px-4 py-4 text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                    />
                    {isLoading && (
                        <LoaderCircle
                            aria-hidden="true"
                            className="h-5 w-5 shrink-0 animate-spin text-gray-400"
                        />
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('search.close')}
                        className="shrink-0 border-0 p-1 text-gray-500 hover:cursor-pointer hover:text-gray-900 dark:hover:text-white"
                    >
                        <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                </div>

                {showResults && results.length > 0 && (
                    <div
                        role="group"
                        aria-label={t('search.filterType')}
                        className="flex flex-wrap gap-1 border-b border-gray-200 px-4 py-2 dark:border-white/5"
                    >
                        {(['all', ...availableTypes] as SearchTab[]).map(
                            (tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    aria-pressed={effectiveTab === tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setSelectedIndex(0);
                                    }}
                                    className={
                                        'rounded-lg border-0 px-3 py-1 text-xs ' +
                                        (effectiveTab === tab
                                            ? 'bg-blue-50 text-blue-600 dark:bg-neutral-800 dark:text-blue-400'
                                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800')
                                    }
                                >
                                    {t('search.types.' + tab)}
                                    {tab !== 'all' &&
                                        ' (' +
                                            results.filter(
                                                (result) =>
                                                    result.type?.toLowerCase() ===
                                                    tab,
                                            ).length +
                                            ')'}
                                </button>
                            ),
                        )}
                    </div>
                )}

                <div className="max-h-[55vh] overflow-y-auto">
                    {trimmedQuery.length < MIN_SEARCH_LENGTH && (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            <Search
                                aria-hidden="true"
                                className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
                            />
                            <p>
                                {t(
                                    trimmedQuery
                                        ? 'search.minChars'
                                        : 'search.startTyping',
                                )}
                            </p>
                            {!trimmedQuery && (
                                <p className="mt-2 text-sm">
                                    {t('search.searchHint')}
                                </p>
                            )}
                        </div>
                    )}
                    {isLoading && (
                        <p
                            role="status"
                            className="p-6 text-center text-gray-500 dark:text-gray-400"
                        >
                            {t('search.loading')}
                        </p>
                    )}
                    {!isLoading &&
                        trimmedQuery.length >= MIN_SEARCH_LENGTH &&
                        search.isError && (
                            <div
                                role="alert"
                                className="p-6 text-center text-gray-500 dark:text-gray-400"
                            >
                                <p>{t('search.error')}</p>
                                <button
                                    type="button"
                                    className="mt-3"
                                    onClick={() => void search.refetch()}
                                >
                                    {t('search.retry')}
                                </button>
                            </div>
                        )}
                    {showResults &&
                        search.isSuccess &&
                        results.length === 0 && (
                            <p
                                role="status"
                                className="p-6 text-center text-gray-500 dark:text-gray-400"
                            >
                                {t('search.noResults', { query: trimmedQuery })}
                            </p>
                        )}
                    <div
                        ref={resultsRef}
                        id={id + '-results'}
                        role="listbox"
                        aria-label={t('search.results')}
                        aria-busy={isLoading}
                    >
                        {showResults &&
                            filteredResults.map((result, index) => (
                                <button
                                    key={
                                        result.symbol +
                                        '-' +
                                        result.exchange +
                                        '-' +
                                        index
                                    }
                                    type="button"
                                    role="option"
                                    tabIndex={-1}
                                    id={id + '-option-' + index}
                                    aria-selected={index === activeIndex}
                                    data-index={index}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onClick={() => selectResult(result)}
                                    className={
                                        'flex w-full items-center gap-3 rounded-none border-0 px-4 py-3 text-left ' +
                                        (index === activeIndex
                                            ? 'bg-blue-50 dark:bg-neutral-800'
                                            : 'hover:bg-gray-50 dark:hover:bg-neutral-800')
                                    }
                                >
                                    <SymbolLogo result={result} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {result.symbol}
                                            </span>
                                            {result.type && (
                                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-white/10 dark:text-gray-300">
                                                    {t(
                                                        'search.types.' +
                                                            result.type.toLowerCase(),
                                                        {
                                                            defaultValue:
                                                                result.type,
                                                        },
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        {result.name && (
                                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                                {result.name}
                                            </span>
                                        )}
                                    </span>
                                    {result.exchange && (
                                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                            {result.exchange}
                                        </span>
                                    )}
                                </button>
                            ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-white/5 dark:bg-black/5 dark:text-gray-400">
                    <span>↑ ↓ {t('search.navigate')}</span>
                    <span>↵ {t('search.select')}</span>
                    <span>esc {t('search.close')}</span>
                </div>
            </div>
        </div>,
        document.body,
    );
}

export function GlobalSearch({ isOpen, ...props }: GlobalSearchProps) {
    return isOpen ? <SearchDialog {...props} /> : null;
}
