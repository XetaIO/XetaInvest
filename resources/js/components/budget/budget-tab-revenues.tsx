import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetLineDraft } from '@/types';
import { BudgetLineRow } from './budget-line-row';

type Props = {
    lines: BudgetLineDraft[];
    onChange: (lines: BudgetLineDraft[]) => void;
};

export function BudgetTabRevenues({ lines, onChange }: Props) {
    const updateLine = (index: number, next: BudgetLineDraft) => {
        const copy = [...lines];
        copy[index] = next;
        onChange(copy);
    };

    const removeLine = (index: number) => {
        onChange(lines.filter((_, i) => i !== index));
    };

    const addLine = () => {
        onChange([...lines, { name: '', amount: 0 }]);
    };

    return (
        <Card className="py-6">
            <CardHeader>
                <CardTitle>Revenus</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pb-6">
                {lines.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Aucune source de revenu pour le moment.
                    </p>
                )}
                {lines.map((line, index) => (
                    <BudgetLineRow
                        key={index}
                        name={line.name}
                        amount={line.amount}
                        namePlaceholder="Ex. Salaire"
                        onChange={(next) => updateLine(index, next)}
                        onRemove={() => removeLine(index)}
                    />
                ))}
                <div>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                        <Plus className="mr-1 size-4" />
                        Ajouter une source de revenu
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
