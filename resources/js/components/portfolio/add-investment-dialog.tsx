import { useForm } from '@inertiajs/react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { SearchResult } from '@/types/portfolio';
import { search as apiSearch } from '@/routes/api';
import { store as storePosition } from '@/routes/positions';

type Line = {
    quantity: string;
    unit_price: string;
    executed_at: string;
    notes: string;
};

const emptyLine = (): Line => ({
    quantity: '',
    unit_price: '',
    executed_at: new Date().toISOString().slice(0, 10),
    notes: '',
});

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    portfolioId: number;
};

export function AddInvestmentDialog({
    open,
    onOpenChange,
    portfolioId,
}: Props) {
    const { t } = useTranslation();
    const [step, setStep] = useState<'search' | 'lines'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<SearchResult | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const form = useForm<{ symbol: string; lines: Line[] }>({
        symbol: '',
        lines: [emptyLine()],
    });

    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStep('search');

            setQuery('');

            setResults([]);

            setSelected(null);
            form.reset();
            form.clearErrors();
            form.setData({ symbol: '', lines: [emptyLine()] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (step !== 'search') {
            return;
        }

        const q = query.trim();

        if (q.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults([]);

            return;
        }

        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const url = apiSearch({ query: { q } }).url;
                const res = await fetch(url, {
                    signal: ctrl.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                });

                if (!res.ok) {
                    throw new Error('Search failed');
                }

                const json = await res.json();
                const items: SearchResult[] = Array.isArray(json)
                    ? json
                    : (json.results ?? json.data ?? []);
                setResults(items);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setResults([]);
                }
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [query, step]);

    const pickResult = (r: SearchResult) => {
        setSelected(r);
        form.setData('symbol', r.symbol);
        setStep('lines');
    };

    const addLine = () =>
        form.setData('lines', [...form.data.lines, emptyLine()]);
    const removeLine = (i: number) => {
        if (form.data.lines.length === 1) {
            return;
        }

        form.setData(
            'lines',
            form.data.lines.filter((_, idx) => idx !== i),
        );
    };
    const updateLine = (i: number, key: keyof Line, value: string) => {
        const next = [...form.data.lines];
        next[i] = { ...next[i], [key]: value };
        form.setData('lines', next);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            symbol: data.symbol,
            lines: data.lines.map((l) => ({
                quantity: Number(l.quantity),
                unit_price: Number(l.unit_price),
                executed_at: l.executed_at,
                notes: l.notes || null,
            })),
        }));
        form.post(storePosition(portfolioId).url, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'search'
                            ? t('position.add_dialog_title')
                            : t('position.add_dialog_lines', {
                                symbol: selected?.symbol,
                            })}
                    </DialogTitle>
                </DialogHeader>

                {step === 'search' && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                autoFocus
                                placeholder={t('position.search_placeholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9"
                            />
                            {searching && (
                                <Spinner className="absolute top-2.5 right-3 h-4 w-4" />
                            )}
                        </div>
                        <div className="max-h-80 space-y-1 overflow-y-auto">
                            {results.length === 0 &&
                                query.trim().length >= 2 &&
                                !searching && (
                                    <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                                        {t('position.no_results')}
                                    </p>
                                )}
                            {results.map((r) => (
                                <button
                                    key={`${r.symbol}-${r.exchange ?? ''}`}
                                    type="button"
                                    onClick={() => pickResult(r)}
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">
                                            {r.name || r.symbol}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {r.symbol}
                                            {r.type
                                                ? ` · ${r.type.toUpperCase()}`
                                                : ''}
                                        </div>
                                    </div>
                                    <div className="ml-3 shrink-0 text-xs text-muted-foreground">
                                        {r.exchange}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'lines' && (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                            <span className="font-medium">
                                {selected?.symbol}
                            </span>{' '}
                            — {selected?.name}
                        </div>
                        <div className="space-y-3">
                            {form.data.lines.map((line, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-1 gap-2 rounded-md border p-3 md:grid-cols-12"
                                >
                                    <div className="md:col-span-2">
                                        <Label className="text-xs">
                                            {t('position.quantity')}
                                        </Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={line.quantity}
                                            onChange={(e) =>
                                                updateLine(
                                                    i,
                                                    'quantity',
                                                    e.target.value,
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
                                            step="any"
                                            min="0"
                                            value={line.unit_price}
                                            onChange={(e) =>
                                                updateLine(
                                                    i,
                                                    'unit_price',
                                                    e.target.value,
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
                                            value={line.executed_at}
                                            onChange={(e) =>
                                                updateLine(
                                                    i,
                                                    'executed_at',
                                                    e.target.value,
                                                )
                                            }
                                            max={new Date()
                                                .toISOString()
                                                .slice(0, 10)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <Label className="text-xs">
                                            {t('position.note')}
                                        </Label>
                                        <Input
                                            value={line.notes}
                                            onChange={(e) =>
                                                updateLine(
                                                    i,
                                                    'notes',
                                                    e.target.value,
                                                )
                                            }
                                            maxLength={500}
                                        />
                                    </div>
                                    <div className="flex items-end md:col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLine(i)}
                                            disabled={
                                                form.data.lines.length === 1
                                            }
                                        >
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {Object.keys(form.errors).length > 0 && (
                            <p className="text-xs text-rose-500">
                                {Object.values(form.errors)
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        )}
                        <div className="flex justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addLine}
                            >
                                <Plus className="mr-1 h-4 w-4" />{' '}
                                {t('position.add_line')}
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep('search')}
                                >
                                    {t('position.back')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {t('position.save')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}

                {step === 'search' && (
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('position.cancel')}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
