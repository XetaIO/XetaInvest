import { GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
    name: string;
    amount: number;
    namePlaceholder?: string;
    onChange: (line: { name: string; amount: number }) => void;
    onRemove: () => void;
};

export function BudgetLineRow({
    name,
    amount,
    namePlaceholder,
    onChange,
    onRemove,
}: Props) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-2">
            <GripVertical
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
            />
            <Input
                value={name}
                placeholder={namePlaceholder ?? t('budget.line_label')}
                onChange={(e) => onChange({ name: e.target.value, amount })}
                className="flex-1"
            />
            <div className="relative w-36 shrink-0">
                <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={Number.isFinite(amount) ? amount : 0}
                    onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        onChange({
                            name,
                            amount: Number.isFinite(v) && v >= 0 ? v : 0,
                        });
                    }}
                    className="pr-8 text-right"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                </span>
            </div>
            <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={onRemove}
                aria-label={t('budget.remove_line')}
                className="hover:cursor-pointer"
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}
