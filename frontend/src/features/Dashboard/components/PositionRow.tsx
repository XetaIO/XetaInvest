import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DashboardLine } from '../../../bindings/DashboardLine';
import type { DashboardPositionKpis } from '../../../bindings/DashboardPositionKpis';
import type { UpsertTransaction } from '../../../bindings/UpsertTransaction';
import { locoErrorMessage } from '../../../shared/api/client';
import { Button } from '../../../shared/components/ui/button/Button';
import {
    deltaToneClass,
    formatDate,
    formatEur,
    formatNative,
    formatNumber,
    formatPercent,
} from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/twMerge';
import {
    createTransaction,
    deletePosition,
    deleteTransaction,
    updateTransaction,
} from '../api/dashboard';
import { TransactionFormModal } from './TransactionFormModal';
import type { TransactionFormValues } from './TransactionFormModal';

type Props = {
    position: DashboardPositionKpis;
};

function errorMessage(error: unknown): string {
    return locoErrorMessage(error);
}

function InstrumentLogo({
    symbol,
    name,
    logoUrl,
}: {
    symbol: string;
    name: string;
    logoUrl: string | null;
}) {
    const [failed, setFailed] = useState(false);
    if (logoUrl && /^https?:\/\//i.test(logoUrl) && !failed) {
        return (
            <img
                src={logoUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5 dark:bg-white/10"
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/10 dark:text-white/70"
            title={name}
        >
            {symbol.slice(0, 2).toUpperCase()}
        </span>
    );
}

export function PositionRow({ position }: Props) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [txOpen, setTxOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [editing, setEditing] = useState<{
        id?: number;
        initial?: Partial<TransactionFormValues>;
    }>({});

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    const openLines = position.lines.filter(
        (line) => line.remaining_quantity > 0,
    );

    const saveTx = useMutation({
        mutationFn: (payload: UpsertTransaction) =>
            editing.id
                ? updateTransaction(editing.id, payload)
                : createTransaction(position.position_id, payload),
        onSuccess: () => {
            setFormError(null);
            setTxOpen(false);
            void invalidate();
        },
        onError: (error) => setFormError(errorMessage(error)),
    });

    const removePosition = useMutation({
        mutationFn: () => deletePosition(position.position_id),
        onSuccess: () => {
            void invalidate();
        },
    });

    const removeTx = useMutation({
        mutationFn: (id: number) => deleteTransaction(id),
        onSuccess: () => {
            void invalidate();
        },
    });

    function openCreateTx() {
        setEditing({});
        setFormError(null);
        setTxOpen(true);
    }

    function openEditTx(line: DashboardLine) {
        setEditing({
            id: line.transaction_id,
            initial: {
                kind: 'buy',
                quantity: String(line.original_quantity),
                unit_price: String(line.unit_price),
                executed_at: line.executed_at.slice(0, 10),
                notes: '',
            },
        });
        setFormError(null);
        setTxOpen(true);
    }

    function handleDeletePosition() {
        if (
            !confirm(
                t('position.confirm_delete', {
                    symbol: position.instrument.symbol,
                }),
            )
        ) {
            return;
        }
        removePosition.mutate();
    }

    function handleDeleteTx(txId: number) {
        if (!confirm(t('position.confirm_delete_tx'))) {
            return;
        }
        removeTx.mutate(txId);
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-mist-950/60">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-4 p-4 text-left hover:cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                onClick={() => setOpen((current) => !current)}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
                            open && 'rotate-180',
                        )}
                    />
                    <InstrumentLogo
                        symbol={position.instrument.symbol}
                        name={position.instrument.name}
                        logoUrl={position.instrument.logo_url}
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                to={'/symbol/' + position.instrument.symbol}
                                className="font-semibold text-gray-800 hover:text-brand-500 dark:text-white/90"
                            >
                                {position.instrument.name}
                            </Link>
                            <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:border-white/15 dark:text-white/60">
                                {position.currency}
                            </span>
                            {position.instrument.exchange && (
                                <span className="text-xs text-gray-500 dark:text-white/50">
                                    {position.instrument.exchange}
                                </span>
                            )}
                        </div>
                        <div className="truncate text-xs text-gray-500 dark:text-white/50">
                            {position.instrument.symbol}
                        </div>
                    </div>
                </div>
                <div className="hidden grid-cols-4 gap-6 text-right text-sm tabular-nums md:grid">
                    <HeaderStat
                        label={t('position.col_qty')}
                        value={formatNumber(position.quantity)}
                    />
                    <HeaderStat
                        label={t('position.col_value')}
                        value={formatEur(position.current_value_eur)}
                    />
                    <HeaderStat
                        label={t('position.col_pnl')}
                        value={formatEur(position.pnl_eur)}
                        tone={position.pnl_eur}
                    />
                    <HeaderStat
                        label={t('position.col_pnl_pct')}
                        value={formatPercent(position.pnl_pct)}
                        tone={position.pnl_pct}
                    />
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/3">
                    <div className="mb-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                        <Stat
                            label={t('position.current_price')}
                            value={formatNative(
                                position.price,
                                position.currency,
                            )}
                        />
                        <Stat
                            label={t('position.avg_cost')}
                            value={formatNative(
                                position.avg_cost,
                                position.currency,
                            )}
                        />
                        <Stat
                            label={t('position.daily_change')}
                            value={formatEur(position.daily_change_eur)}
                            tone={position.daily_change_eur}
                        />
                        <Stat
                            label={t('position.invested')}
                            value={formatEur(position.invested_eur)}
                        />
                        <Stat
                            label={t('position.realized')}
                            value={formatEur(position.realized_pnl_eur)}
                            tone={position.realized_pnl_eur}
                        />
                    </div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {t('position.open_lines')}
                        </h4>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={openCreateTx}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {t('position.add_transaction')}
                            </Button>
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="text-rose-500"
                                onClick={handleDeletePosition}
                                isLoading={removePosition.isPending}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('position.delete')}
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white dark:border-white/10 dark:bg-mist-950">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs tracking-wide text-gray-500 uppercase dark:bg-white/5 dark:text-white/50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">
                                        {t('position.date')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.col_qty_init')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.col_qty_remaining')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.col_pu')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.invested')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.col_value')}
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('position.col_pnl')}
                                    </th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {openLines.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-3 py-6 text-center text-gray-500 dark:text-white/50"
                                        >
                                            {t('position.no_lines')}
                                        </td>
                                    </tr>
                                )}
                                {openLines.map((line) => (
                                    <tr
                                        key={line.transaction_id}
                                        className="border-t border-gray-100 tabular-nums dark:border-white/10"
                                    >
                                        <td className="px-3 py-2 text-gray-800 dark:text-white/90">
                                            {formatDate(line.executed_at)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatNumber(
                                                line.original_quantity,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatNumber(
                                                line.remaining_quantity,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatNative(
                                                line.unit_price,
                                                position.currency,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatNative(
                                                line.invested,
                                                position.currency,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {formatNative(
                                                line.current_value,
                                                position.currency,
                                            )}
                                        </td>
                                        <td
                                            className={cn(
                                                'px-3 py-2 text-right',
                                                deltaToneClass(line.pnl),
                                            )}
                                        >
                                            {formatNative(
                                                line.pnl,
                                                position.currency,
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    type="button"
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() =>
                                                        openEditTx(line)
                                                    }
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                    {t('position.edit')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="xs"
                                                    variant="outline"
                                                    className="px-2"
                                                    onClick={() =>
                                                        handleDeleteTx(
                                                            line.transaction_id,
                                                        )
                                                    }
                                                    isLoading={
                                                        removeTx.isPending
                                                    }
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <TransactionFormModal
                open={txOpen}
                onClose={() => setTxOpen(false)}
                isEdit={Boolean(editing.id)}
                initial={editing.initial}
                isSubmitting={saveTx.isPending}
                error={formError}
                onSubmit={(payload) => saveTx.mutate(payload)}
            />
        </div>
    );
}

function HeaderStat({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: number;
}) {
    return (
        <div>
            <div className="text-xs text-gray-500 dark:text-white/45">
                {label}
            </div>
            <div
                className={cn(
                    'font-medium text-gray-800 dark:text-white/90',
                    tone !== undefined && deltaToneClass(tone),
                )}
            >
                {value}
            </div>
        </div>
    );
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: number;
}) {
    return (
        <div>
            <div className="text-xs text-gray-500 dark:text-white/45">
                {label}
            </div>
            <div
                className={cn(
                    'text-gray-800 tabular-nums dark:text-white/90',
                    tone !== undefined && deltaToneClass(tone),
                )}
            >
                {value}
            </div>
        </div>
    );
}
