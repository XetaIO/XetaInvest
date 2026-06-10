import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BudgetGroupDraft, BudgetLineDraft } from '@/types/budget';
import { BudgetLineRow } from './budget-line-row';

type Props = {
    title: string;
    groups: BudgetGroupDraft[];
    onChange: (groups: BudgetGroupDraft[]) => void;
    addGroupLabel: string;
    addLineLabel: string;
    groupPlaceholder: string;
    linePlaceholder: string;
    emptyText: string;
};

export function BudgetTabGroups({
    title,
    groups,
    onChange,
    addGroupLabel,
    addLineLabel,
    groupPlaceholder,
    linePlaceholder,
    emptyText,
}: Props) {
    const { t } = useTranslation();
    const updateGroup = (index: number, next: BudgetGroupDraft) => {
        const copy = [...groups];
        copy[index] = next;
        onChange(copy);
    };

    const removeGroup = (index: number) => {
        onChange(
            groups.filter((_g: BudgetGroupDraft, i: number) => i !== index),
        );
    };

    const addGroup = () => {
        onChange([...groups, { name: '', lines: [] }]);
    };

    const updateLine = (gIdx: number, lIdx: number, next: BudgetLineDraft) => {
        const group = groups[gIdx];
        const copyLines = [...group.lines];
        copyLines[lIdx] = next;
        updateGroup(gIdx, { ...group, lines: copyLines });
    };

    const removeLine = (gIdx: number, lIdx: number) => {
        const group = groups[gIdx];
        updateGroup(gIdx, {
            ...group,
            lines: group.lines.filter(
                (_l: BudgetLineDraft, i: number) => i !== lIdx,
            ),
        });
    };

    const addLine = (gIdx: number) => {
        const group = groups[gIdx];
        updateGroup(gIdx, {
            ...group,
            lines: [...group.lines, { name: '', amount: 0 }],
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="sr-only">{title}</h2>
            {groups.length === 0 && (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
            )}
            {groups.map((group, gIdx) => (
                <Card className="py-6" key={gIdx}>
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                        <Input
                            value={group.name}
                            placeholder={groupPlaceholder}
                            onChange={(e) =>
                                updateGroup(gIdx, {
                                    ...group,
                                    name: e.target.value,
                                })
                            }
                            className="max-w-md font-medium"
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeGroup(gIdx)}
                            aria-label={t('budget.remove_group')}
                            className="ml-auto hover:cursor-pointer"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pb-6">
                        {group.lines.map((line, lIdx) => (
                            <BudgetLineRow
                                key={lIdx}
                                name={line.name}
                                amount={line.amount}
                                namePlaceholder={linePlaceholder}
                                onChange={(next) =>
                                    updateLine(gIdx, lIdx, next)
                                }
                                onRemove={() => removeLine(gIdx, lIdx)}
                            />
                        ))}
                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addLine(gIdx)}
                                className="hover:cursor-pointer"
                            >
                                <Plus className="mr-1 size-4" />
                                {addLineLabel}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <div>
                <Button type="button" variant="secondary" onClick={addGroup}>
                    <Plus className="mr-1 size-4" />
                    {addGroupLabel}
                </Button>
            </div>
        </div>
    );
}
