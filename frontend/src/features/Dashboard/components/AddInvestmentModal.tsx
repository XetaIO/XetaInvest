import { useMutation, useQuery } from '@tanstack/react-query';
import { LoaderCircle, Plus, Save, Search, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreatePosition } from '../../../bindings/CreatePosition';
import { locoErrorMessage } from '../../../shared/api/client';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { Modal } from '../../../shared/components/ui/modal/Modal';
import { SymbolLogo } from '../../../shared/utils/symbol';
import { symbolSearchOptions } from '../../GlobalSearch/api/symbolSearch';
import { MIN_SEARCH_LENGTH } from '../../GlobalSearch/types';
import type { SymbolSearchResult } from '../../GlobalSearch/types';
import { createPosition } from '../api/dashboard';

type Line = {
    quantity: string;
    unit_price: string;
    executed_at: string;
    notes: string;
};

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function emptyLine(): Line {
    return {
        quantity: '',
        unit_price: '',
        executed_at: todayIsoDate(),
        notes: '',
    };
}

type Props = {
    open: boolean;
    onClose: () => void;
    portfolioId: number;
    onCreated: () => void;
};

export function AddInvestmentModal({
    open,
    onClose,
    portfolioId,
    onCreated,
}: Props) {
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState<'search' | 'lines'>('search');
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selected, setSelected] = useState<SymbolSearchResult | null>(null);
    const [lines, setLines] = useState<Line[]>([emptyLine()]);
    const [formError, setFormError] = useState<string | null>(null);
    const region = (i18n.resolvedLanguage || i18n.language).startsWith('fr')
        ? 'FR'
        : 'US';

    useEffect(() => {
        if (!open) {
            return;
        }
        setStep('search');
        setQuery('');
        setDebouncedQuery('');
        setSelected(null);
        setLines([emptyLine()]);
        setFormError(null);
    }, [open]);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedQuery(query.trim()),
            450,
        );
        return () => window.clearTimeout(timer);
    }, [query]);

    const search = useQuery({
        ...symbolSearchOptions({ q: debouncedQuery, region }),
        enabled:
            open &&
            step === 'search' &&
            debouncedQuery.length >= MIN_SEARCH_LENGTH,
    });

    const save = useMutation({
        mutationFn: (body: CreatePosition) => createPosition(portfolioId, body),
        onSuccess: () => {
            onCreated();
            onClose();
        },
        onError: (error) => setFormError(locoErrorMessage(error)),
    });

    function pickResult(result: SymbolSearchResult) {
        setSelected(result);
        setStep('lines');
        setFormError(null);
    }

    function updateLine(index: number, key: keyof Line, value: string) {
        setLines((current) =>
            current.map((line, i) =>
                i === index ? { ...line, [key]: value } : line,
            ),
        );
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!selected) return;
        save.mutate({
            symbol: selected.symbol,
            lines: lines.map((line) => ({
                quantity: Number(line.quantity),
                unit_price: Number(line.unit_price),
                executed_at: line.executed_at,
                notes: line.notes.trim() ? line.notes.trim() : null,
            })),
        });
    }

    const results = search.data ?? [];
    const isSearching = search.isFetching;

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-3xl p-6">
            <h2 className="pr-12 text-lg font-semibold text-gray-800 dark:text-white/90">
                {step === 'search'
                    ? t('position.add_modal_title')
                    : t('position.add_modal_lines', {
                          symbol: selected?.symbol,
                      })}
            </h2>

            {step === 'search' && (
                <div className="mt-5 space-y-3">
                    <div className="relative">
                        <Search className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                        <Input
                            autoFocus
                            placeholder={t('position.search_placeholder')}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="pl-9"
                        />
                        {isSearching && (
                            <LoaderCircle className="absolute top-3 right-3 h-5 w-5 animate-spin" />
                        )}
                    </div>
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                        {isSearching && (
                            <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-white/50">
                                {t('common.loading')}
                            </p>
                        )}
                        {!isSearching &&
                            query.trim().length >= MIN_SEARCH_LENGTH &&
                            results.length === 0 && (
                                <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-white/50">
                                    {t('position.no_results')}
                                </p>
                            )}
                        {results.map((result) => (
                            <button
                                key={`${result.symbol}-${result.exchange ?? ''}`}
                                type="button"
                                onClick={() => pickResult(result)}
                                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                            >
                                <SymbolLogo result={result} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium text-gray-800 dark:text-white/90">
                                        {result.name || result.symbol}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-white/50">
                                        {result.symbol}
                                        {result.type
                                            ? ` · ${result.type.toUpperCase()}`
                                            : ''}
                                    </div>
                                </div>
                                <div className="ml-3 shrink-0 text-xs text-gray-500 dark:text-white/50">
                                    {result.exchange}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={onClose}
                        >
                            {t('position.cancel')}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'lines' && selected && (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm dark:border-white/10 dark:bg-neutral-950">
                        <SymbolLogo result={selected} />
                        <div className="min-w-0">
                            <span className="font-medium text-gray-800 dark:text-white/90">
                                {selected.symbol}
                            </span>
                            <span className="text-gray-500 dark:text-white/50">
                                {' '}
                                — {selected.name}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {lines.map((line, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-1 gap-2 rounded-md border border-gray-200 p-3 md:grid-cols-12 dark:border-white/10"
                            >
                                <div className="md:col-span-2">
                                    <Label className="text-xs">
                                        {t('position.quantity')}
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step={0.0001}
                                        value={line.quantity}
                                        onChange={(event) =>
                                            updateLine(
                                                index,
                                                'quantity',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <Label className="text-xs">
                                        {t('position.unit_price')}
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step={0.01}
                                        value={line.unit_price}
                                        onChange={(event) =>
                                            updateLine(
                                                index,
                                                'unit_price',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <Label className="text-xs">
                                        {t('position.date')}
                                    </Label>
                                    <Input
                                        type="date"
                                        max={todayIsoDate()}
                                        value={line.executed_at}
                                        onChange={(event) =>
                                            updateLine(
                                                index,
                                                'executed_at',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <Label className="text-xs">
                                        {t('position.note')}
                                    </Label>
                                    <Input
                                        value={line.notes}
                                        onChange={(event) =>
                                            updateLine(
                                                index,
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex items-end md:col-span-1">
                                    <Button
                                        type="button"
                                        variant="transparent"
                                        className="hidden! px-2 md:inline-flex!"
                                        onClick={() =>
                                            setLines((current) =>
                                                current.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                        disabled={lines.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        className="w-full px-2 md:hidden"
                                        onClick={() =>
                                            setLines((current) =>
                                                current.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            )
                                        }
                                        disabled={lines.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {formError && (
                        <p className="text-xs text-rose-500">{formError}</p>
                    )}
                    <div className="flex flex-col justify-between md:flex-row">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                                setLines((current) => [...current, emptyLine()])
                            }
                        >
                            <Plus className="h-4 w-4" />
                            {t('position.add_line')}
                        </Button>
                        <div className="mt-2 flex flex-col gap-2 md:mt-0 md:flex-row">
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setStep('search')}
                            >
                                {t('position.back')}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                isLoading={save.isPending}
                            >
                                <Save className="h-4 w-4" />
                                {t('position.save')}
                            </Button>
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
}
