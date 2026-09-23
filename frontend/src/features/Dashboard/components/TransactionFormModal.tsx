import { Edit, Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransactionKind } from '../../../bindings/TransactionKind';
import type { UpsertTransaction } from '../../../bindings/UpsertTransaction';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { Modal } from '../../../shared/components/ui/modal/Modal';

export type TransactionFormValues = {
    kind: TransactionKind;
    quantity: string;
    unit_price: string;
    executed_at: string;
    notes: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    isEdit: boolean;
    initial?: Partial<TransactionFormValues>;
    isSubmitting: boolean;
    error: string | null;
    onSubmit: (payload: UpsertTransaction) => void;
};

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

function emptyForm(
    initial?: Partial<TransactionFormValues>,
): TransactionFormValues {
    return {
        kind: initial?.kind ?? 'buy',
        quantity: initial?.quantity ?? '',
        unit_price: initial?.unit_price ?? '',
        executed_at: initial?.executed_at ?? todayIsoDate(),
        notes: initial?.notes ?? '',
    };
}

export function TransactionFormModal({
    open,
    onClose,
    isEdit,
    initial,
    isSubmitting,
    error,
    onSubmit,
}: Props) {
    const { t } = useTranslation();
    const [form, setForm] = useState<TransactionFormValues>(() =>
        emptyForm(initial),
    );

    useEffect(() => {
        if (open) {
            setForm(emptyForm(initial));
        }
    }, [open, initial]);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        onSubmit({
            kind: form.kind,
            quantity: Number(form.quantity),
            unit_price: Number(form.unit_price),
            executed_at: form.executed_at,
            notes: form.notes.trim() ? form.notes.trim() : null,
        });
    }

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-lg p-6">
            <h2 className="pr-12 text-lg font-semibold text-gray-800 dark:text-white/90">
                {isEdit
                    ? t('position.transaction_edit')
                    : t('position.transaction_new')}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="tx-kind">{t('position.type')}</Label>
                        <select
                            id="tx-kind"
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-mist-950 dark:text-white"
                            value={form.kind}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    kind: event.target.value as TransactionKind,
                                }))
                            }
                        >
                            <option value="buy">{t('dashboard.buy')}</option>
                            <option value="sell">{t('dashboard.sell')}</option>
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="tx-date">{t('position.date')}</Label>
                        <Input
                            id="tx-date"
                            type="date"
                            value={form.executed_at}
                            max={todayIsoDate()}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    executed_at: event.target.value,
                                }))
                            }
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="tx-qty">{t('position.quantity')}</Label>
                        <Input
                            id="tx-qty"
                            type="number"
                            min="0"
                            step={0.0001}
                            value={form.quantity}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    quantity: event.target.value,
                                }))
                            }
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="tx-price">
                            {t('position.unit_price')}
                        </Label>
                        <Input
                            id="tx-price"
                            type="number"
                            min="0"
                            step={0.01}
                            value={form.unit_price}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    unit_price: event.target.value,
                                }))
                            }
                            required
                        />
                    </div>
                </div>
                <div>
                    <Label htmlFor="tx-notes">
                        {t('position.note_optional')}
                    </Label>
                    <Input
                        id="tx-notes"
                        value={form.notes}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                notes: event.target.value,
                            }))
                        }
                    />
                </div>
                {error && <p className="text-xs text-rose-500">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={onClose}
                    >
                        {t('position.cancel')}
                    </Button>
                    <Button type="submit" size="sm" isLoading={isSubmitting}>
                        {isEdit ? (
                            <>
                                <Edit className="h-4 w-4" />{' '}
                                {t('position.save')}
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" /> {t('position.add')}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
