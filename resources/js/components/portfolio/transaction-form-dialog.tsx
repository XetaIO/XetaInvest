import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { TransactionTypeOption } from '@/types/portfolio';
import {
    store as storeTransaction,
    update as updateTransaction,
} from '@/routes/transactions';

export type TransactionFormValues = {
    type: 'buy' | 'sell';
    quantity: string;
    unit_price: string;
    executed_at: string;
    notes: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    positionId: number;
    transactionId?: number;
    initial?: Partial<TransactionFormValues>;
    transactionTypes: TransactionTypeOption[];
};

export function TransactionFormDialog({
    open,
    onOpenChange,
    positionId,
    transactionId,
    initial,
    transactionTypes,
}: Props) {
    const { t } = useTranslation();
    const isEdit = !!transactionId;
    const form = useForm<TransactionFormValues>({
        type: (initial?.type as 'buy' | 'sell') ?? 'buy',
        quantity: initial?.quantity ?? '',
        unit_price: initial?.unit_price ?? '',
        executed_at:
            initial?.executed_at ?? new Date().toISOString().slice(0, 10),
        notes: initial?.notes ?? '',
    });

    useEffect(() => {
        if (open) {
            form.setData({
                type: (initial?.type as 'buy' | 'sell') ?? 'buy',
                quantity: initial?.quantity ?? '',
                unit_price: initial?.unit_price ?? '',
                executed_at:
                    initial?.executed_at ??
                    new Date().toISOString().slice(0, 10),
                notes: initial?.notes ?? '',
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, transactionId]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            type: data.type,
            quantity: Number(data.quantity),
            unit_price: Number(data.unit_price),
            executed_at: data.executed_at,
            notes: data.notes || null,
        }));
        const onSuccess = () => onOpenChange(false);

        if (isEdit && transactionId) {
            form.patch(updateTransaction(transactionId).url, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post(storeTransaction(positionId).url, {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit
                            ? t('position.transaction_edit')
                            : t('position.transaction_new')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>{t('position.type')}</Label>
                            <Select
                                value={form.data.type}
                                onValueChange={(v) =>
                                    form.setData('type', v as 'buy' | 'sell')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {transactionTypes.map((t) => (
                                        <SelectItem
                                            key={t.value}
                                            value={t.value}
                                        >
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tx-date">
                                {t('position.date')}
                            </Label>
                            <Input
                                id="tx-date"
                                type="date"
                                value={form.data.executed_at}
                                onChange={(e) =>
                                    form.setData('executed_at', e.target.value)
                                }
                                max={new Date().toISOString().slice(0, 10)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tx-qty">
                                {t('position.quantity')}
                            </Label>
                            <Input
                                id="tx-qty"
                                type="number"
                                step="any"
                                min="0"
                                value={form.data.quantity}
                                onChange={(e) =>
                                    form.setData('quantity', e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tx-price">
                                {t('position.unit_price')}
                            </Label>
                            <Input
                                id="tx-price"
                                type="number"
                                step="any"
                                min="0"
                                value={form.data.unit_price}
                                onChange={(e) =>
                                    form.setData('unit_price', e.target.value)
                                }
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tx-notes">
                            {t('position.note_optional')}
                        </Label>
                        <Input
                            id="tx-notes"
                            value={form.data.notes}
                            onChange={(e) =>
                                form.setData('notes', e.target.value)
                            }
                            maxLength={500}
                        />
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <p className="text-xs text-rose-500">
                            {Object.values(form.errors)
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? t('portfolio.update') : t('position.add')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
