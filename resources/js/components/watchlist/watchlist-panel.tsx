import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
/* eslint-disable react-hooks/refs */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WatchlistRow } from '@/components/watchlist/watchlist-row';
import { WatchlistSectionFormDialog } from '@/components/watchlist/watchlist-section-form-dialog';
import { WatchlistSymbolDialog } from '@/components/watchlist/watchlist-symbol-dialog';
import { cn } from '@/lib/utils';
import { flattenWatchlistItems, moveWatchlistLayout } from '@/lib/watchlist';
import type {
    PriceUpdate,
    Watchlist,
    WatchlistSection,
} from '@/types/watchlist';

type Props = {
    watchlist: Watchlist;
    prices: Map<string, PriceUpdate>;
    maxItems: number;
    selectedSymbol: string;
    onSelectSymbol: (symbol: string) => void;
};

export function WatchlistPanel({
    watchlist,
    prices,
    maxItems,
    selectedSymbol,
    onSelectSymbol,
}: Props) {
    const { t } = useTranslation();
    const [sections, setSections] = useState(watchlist.sections);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [createSectionOpen, setCreateSectionOpen] = useState(false);
    const [editSection, setEditSection] = useState<WatchlistSection | null>(
        null,
    );
    const [symbolSection, setSymbolSection] = useState<WatchlistSection | null>(
        null,
    );
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const itemCount = useMemo(
        () => flattenWatchlistItems(sections).length,
        [sections],
    );

    const toggleCollapsed = (sectionId: string) => {
        setCollapsed((current) => {
            const next = new Set(current);

            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }

            return next;
        });
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) {
            return;
        }

        const next = moveWatchlistLayout(
            sections,
            String(active.id),
            String(over.id),
        );

        if (next === sections) {
            return;
        }

        setSections(next);
        router.patch(
            `/watchlists/${watchlist.id}/reorder`,
            {
                sections: next.map((section) => ({
                    id: section.id,
                    item_ids: section.items.map((item) => item.id),
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setSections(watchlist.sections),
            },
        );
    };

    const deleteSection = (section: WatchlistSection) => {
        if (
            !confirm(
                t('watchlist.section_delete_confirm', {
                    name: section.name,
                }),
            )
        ) {
            return;
        }

        router.delete(`/watchlist-sections/${section.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Card className="min-w-0 py-0">
                <CardHeader className="flex flex-row items-center justify-between border-b px-3 py-3">
                    <CardTitle className="min-w-0 truncate text-base">
                        {watchlist.name}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {itemCount} / {maxItems}
                        </span>
                    </CardTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateSectionOpen(true)}
                    >
                        <Plus className="mr-1 h-4 w-4" />
                        {t('watchlist.section_new')}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-[minmax(120px,1fr)_90px_80px_80px_64px] border-b bg-muted/30 text-xs text-muted-foreground">
                        <span className="px-3 py-2">
                            {t('watchlist.column_symbol')}
                        </span>
                        <span className="px-2 py-2 text-right">
                            {t('watchlist.column_price')}
                        </span>
                        <span className="px-2 py-2 text-right">
                            {t('watchlist.column_change')}
                        </span>
                        <span className="px-2 py-2 text-right">
                            {t('watchlist.column_change_percent')}
                        </span>
                        <span />
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sections.map((section) => section.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sections.map((section) => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    collapsed={collapsed.has(section.id)}
                                    prices={prices}
                                    selectedSymbol={selectedSymbol}
                                    onSelectSymbol={onSelectSymbol}
                                    onToggle={() => toggleCollapsed(section.id)}
                                    onAdd={() => setSymbolSection(section)}
                                    onRename={() => setEditSection(section)}
                                    onDelete={() => deleteSection(section)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </CardContent>
            </Card>

            <WatchlistSectionFormDialog
                open={createSectionOpen}
                onOpenChange={setCreateSectionOpen}
                watchlistId={watchlist.id}
            />
            <WatchlistSectionFormDialog
                open={editSection !== null}
                onOpenChange={(open) => !open && setEditSection(null)}
                watchlistId={watchlist.id}
                section={editSection}
            />
            <WatchlistSymbolDialog
                open={symbolSection !== null}
                onOpenChange={(open) => !open && setSymbolSection(null)}
                watchlistId={watchlist.id}
                section={symbolSection}
            />
        </>
    );
}

type SortableSectionProps = {
    section: WatchlistSection;
    collapsed: boolean;
    prices: Map<string, PriceUpdate>;
    selectedSymbol: string;
    onSelectSymbol: (symbol: string) => void;
    onToggle: () => void;
    onAdd: () => void;
    onRename: () => void;
    onDelete: () => void;
};

function SortableSection({
    section,
    collapsed,
    prices,
    selectedSymbol,
    onSelectSymbol,
    onToggle,
    onAdd,
    onRename,
    onDelete,
}: SortableSectionProps) {
    const { t } = useTranslation();
    const sortable = useSortable({
        id: section.id,
        data: { type: 'section' },
    });

    return (
        <section
            ref={sortable.setNodeRef}
            style={{
                transform: CSS.Transform.toString(sortable.transform),
                transition: sortable.transition,
            }}
            className={cn(
                'border-b last:border-b-0',
                sortable.isDragging && 'z-10 opacity-60 shadow',
            )}
        >
            <div className="flex items-center gap-1 bg-muted/20 px-1 py-1">
                <button
                    type="button"
                    ref={sortable.setActivatorNodeRef}
                    {...sortable.attributes}
                    {...sortable.listeners}
                    className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    aria-label={t('watchlist.drag_section', {
                        section: section.name,
                    })}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span className="truncate text-xs font-semibold text-muted-foreground uppercase">
                        {section.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {section.items.length}
                    </span>
                </button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onAdd}
                    title={t('watchlist.add_to_section', {
                        section: section.name,
                    })}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={onRename}>
                            <Pencil className="h-4 w-4" />
                            {t('watchlist.rename')}
                        </DropdownMenuItem>
                        {!section.is_default && (
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={onDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('watchlist.delete')}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {!collapsed && (
                <SortableContext
                    items={section.items.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {section.items.length === 0 ? (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="w-full px-4 py-4 text-center text-xs text-muted-foreground hover:bg-accent/50"
                        >
                            {t('watchlist.section_empty')}
                        </button>
                    ) : (
                        <ul>
                            {section.items.map((item) => {
                                const symbol =
                                    item.instrument.symbol.toUpperCase();

                                return (
                                    <WatchlistRow
                                        key={item.id}
                                        item={item}
                                        price={prices.get(symbol) ?? null}
                                        selected={selectedSymbol === symbol}
                                        onSelect={() => onSelectSymbol(symbol)}
                                    />
                                );
                            })}
                        </ul>
                    )}
                </SortableContext>
            )}
        </section>
    );
}
