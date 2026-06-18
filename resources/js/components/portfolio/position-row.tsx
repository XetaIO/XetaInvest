import { router } from '@inertiajs/react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    deltaToneClass,
    formatDate,
    formatEur,
    formatNative,
    formatNumber,
    formatPercent,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { destroy as destroyPosition } from '@/routes/positions';
import { destroy as destroyTransaction } from '@/routes/transactions';
import type { PositionKpis, TransactionTypeOption } from '@/types/portfolio';
import { TransactionFormDialog } from './transaction-form-dialog';
import type { TransactionFormValues } from './transaction-form-dialog';

type Props = {
    position: PositionKpis;
    transactionTypes: TransactionTypeOption[];
};

export function PositionRow({ position, transactionTypes }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [txDialogOpen, setTxDialogOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<{
        id?: number;
        initial?: Partial<TransactionFormValues>;
    }>({});

    const handleDeletePosition = () => {
        if (
            !confirm(
                t('position.confirm_delete', {
                    symbol: position.instrument.symbol,
                }),
            )
        ) {
            return;
        }

        router.delete(destroyPosition(position.position_id).url, {
            preserveScroll: true,
            onError: () => toast.error(t('position.error_delete')),
        });
    };

    const handleDeleteTx = (txId: number) => {
        if (!confirm(t('position.confirm_delete_tx'))) {
            return;
        }

        router.delete(destroyTransaction(txId).url, {
            preserveScroll: true,
            onError: () => toast.error(t('position.error_delete_tx')),
        });
    };

    const openCreateTx = () => {
        setEditingTx({});
        setTxDialogOpen(true);
    };

    const openEditTx = (txId: number, line: PositionKpis['lines'][number]) => {
        setEditingTx({
            id: txId,
            initial: {
                type: 'buy',
                quantity: String(line.original_quantity),
                unit_price: String(line.unit_price),
                executed_at: line.executed_at,
                notes: '',
            },
        });
        setTxDialogOpen(true);
    };

    return (
        <Card>
            <Collapsible open={open} onOpenChange={setOpen}>
                <CardContent className="p-0">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-4 p-4 text-left hover:cursor-pointer hover:bg-accent/50"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 shrink-0 transition-transform',
                                        open && 'rotate-180',
                                    )}
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">
                                            {position.instrument.name}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {position.currency}
                                        </Badge>
                                        {position.instrument.exchange && (
                                            <span className="text-xs text-muted-foreground">
                                                {position.instrument.exchange}
                                            </span>
                                        )}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {position.instrument.symbol}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden grid-cols-4 gap-4 text-right text-sm tabular-nums md:grid">
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('position.col_qty')}
                                    </div>
                                    <div>{formatNumber(position.quantity)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('position.col_value')}
                                    </div>
                                    <div>
                                        {formatEur(position.current_value_eur)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('position.col_pnl')}
                                    </div>
                                    <div
                                        className={deltaToneClass(
                                            position.pnl_eur,
                                        )}
                                    >
                                        {formatEur(position.pnl_eur)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('position.col_pnl_pct')}
                                    </div>
                                    <div
                                        className={deltaToneClass(
                                            position.pnl_pct,
                                        )}
                                    >
                                        {formatPercent(position.pnl_pct)}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="border-t bg-muted/20 p-4">
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
                                        position.avg_cost_native,
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
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                    {t('position.open_lines')}
                                </h4>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={openCreateTx}
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />{' '}
                                        {t('position.add_transaction')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleDeletePosition}
                                        className="text-rose-500 hover:text-rose-600"
                                    >
                                        <Trash2 className="mr-1 h-3.5 w-3.5" />{' '}
                                        {t('position.delete')}
                                    </Button>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-md border bg-background">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
                                        <tr>
                                            <th className="px-3 py-2 text-left">
                                                {t('position.date')}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t('position.col_qty_init')}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t(
                                                    'position.col_qty_remaining',
                                                )}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t('position.col_pu')}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t('position.invested')}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t('position.col_value')}
                                            </th>
                                            <th className="px-3 py-2 text-right">
                                                {t('position.col_pnl')}
                                            </th>
                                            <th className="px-3 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {position.lines.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={8}
                                                    className="px-3 py-6 text-center text-muted-foreground"
                                                >
                                                    {t('position.no_lines')}
                                                </td>
                                            </tr>
                                        )}
                                        {position.lines.map((line) => (
                                            <tr
                                                key={line.transaction_id}
                                                className="border-t tabular-nums"
                                            >
                                                <td className="px-3 py-2">
                                                    {formatDate(
                                                        line.executed_at,
                                                    )}
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
                                                        line.invested_native,
                                                        position.currency,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {formatNative(
                                                        line.current_value_native,
                                                        position.currency,
                                                    )}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right',
                                                        deltaToneClass(
                                                            line.pnl_native,
                                                        ),
                                                    )}
                                                >
                                                    {formatNative(
                                                        line.pnl_native,
                                                        position.currency,
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                openEditTx(
                                                                    line.transaction_id,
                                                                    line,
                                                                )
                                                            }
                                                        >
                                                            {t('position.edit')}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleDeleteTx(
                                                                    line.transaction_id,
                                                                )
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
                    </CollapsibleContent>
                </CardContent>
            </Collapsible>
            <TransactionFormDialog
                open={txDialogOpen}
                onOpenChange={setTxDialogOpen}
                positionId={position.position_id}
                transactionId={editingTx.id}
                initial={editingTx.initial}
                transactionTypes={transactionTypes}
            />
        </Card>
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
            <div className="text-xs text-muted-foreground">{label}</div>
            <div
                className={cn(
                    'tabular-nums',
                    tone !== undefined && deltaToneClass(tone),
                )}
            >
                {value}
            </div>
        </div>
    );
}
