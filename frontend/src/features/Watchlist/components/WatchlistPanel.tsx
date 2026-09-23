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
import {
    ChevronDown,
    ChevronRight,
    GripVertical,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import type { WatchlistDto } from '../../../bindings/WatchlistDto';
import type { WatchlistSectionDto } from '../../../bindings/WatchlistSectionDto';
import { locoErrorMessage } from '../../../shared/api/client';
import { Button } from '../../../shared/components/ui/button/Button';
import { Dropdown } from '../../../shared/components/ui/dropdown/Dropdown';
import { DropdownItem } from '../../../shared/components/ui/dropdown/DropdownItem';
import { cn } from '../../../shared/utils/twMerge';
import {
    flattenWatchlistItems,
    itemDragId,
    moveWatchlistLayout,
    sectionDragId,
} from '../lib/watchlistLayout';
import { WatchlistFormModal } from './WatchlistFormModal';
import { WatchlistRow } from './WatchlistRow';
import { WatchlistSymbolDialog } from './WatchlistSymbolDialog';

type Props = {
    watchlist: WatchlistDto;
    quotes: Record<string, QuoteDto>;
    maxItems: number;
    selectedSymbol: string;
    onSelectSymbol: (symbol: string) => void;
    isBusy: boolean;
    onCreateSection: (name: string) => Promise<void>;
    onRenameSection: (id: number, name: string) => Promise<void>;
    onDeleteSection: (id: number, name: string) => Promise<void>;
    onAddItem: (sectionId: number, symbol: string) => Promise<void>;
    onRemoveItem: (itemId: number, symbol: string) => Promise<void>;
    onReorder: (
        sections: Array<{ id: number; item_ids: number[] }>,
    ) => Promise<void>;
};

/**
 * Right-hand watchlist table with nested drag-and-drop
 * (Laravel `WatchlistPanel`).
 */
export function WatchlistPanel({
    watchlist,
    quotes,
    maxItems,
    selectedSymbol,
    onSelectSymbol,
    isBusy,
    onCreateSection,
    onRenameSection,
    onDeleteSection,
    onAddItem,
    onRemoveItem,
    onReorder,
}: Props) {
    const { t } = useTranslation();
    const [sections, setSections] = useState(watchlist.sections);
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [createOpen, setCreateOpen] = useState(false);
    const [editSection, setEditSection] = useState<WatchlistSectionDto | null>(
        null,
    );
    const [symbolSection, setSymbolSection] =
        useState<WatchlistSectionDto | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [symbolError, setSymbolError] = useState<string | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const itemCount = useMemo(
        () => flattenWatchlistItems(sections).length,
        [sections],
    );

    useEffect(() => {
        setSections(watchlist.sections);
    }, [watchlist]);

    function toggleCollapsed(sectionId: number) {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    }

    async function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) {
            return;
        }
        const snapshot = sections;
        const next = moveWatchlistLayout(
            sections,
            String(active.id),
            String(over.id),
        );
        if (next === sections) {
            return;
        }
        setSections(next);
        try {
            await onReorder(
                next.map((section) => ({
                    id: section.id,
                    item_ids: section.items.map((item) => item.id),
                })),
            );
        } catch {
            setSections(snapshot);
        }
    }

    return (
        <>
            <section className="flex h-[calc(100dvh-8rem)] min-h-96 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white xl:h-full xl:min-h-0 dark:border-white/10 dark:bg-white/3">
                <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-white/10">
                    <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-white">
                        {watchlist.name}
                        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-white/50">
                            {itemCount} / {maxItems}
                        </span>
                    </h2>
                    <Button
                        type="button"
                        size="xs"
                        variant="transparent"
                        className="h-8 px-2 py-0"
                        onClick={() => {
                            setFormError(null);
                            setCreateOpen(true);
                        }}
                        disabled={isBusy}
                    >
                        <Plus className="h-4 w-4" />
                        {t('watchlist.section_new')}
                    </Button>
                </header>
                {itemCount >= maxItems && (
                    <p className="shrink-0 px-3 pt-2 text-xs text-amber-600 dark:text-amber-300">
                        {t('watchlist.item_limit', { max: maxItems })}
                    </p>
                )}
                <div className="grid shrink-0 grid-cols-[minmax(120px,1fr)_90px_80px_80px_64px] border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
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
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => void handleDragEnd(event)}
                    >
                        <SortableContext
                            items={sections.map((section) =>
                                sectionDragId(section.id),
                            )}
                            strategy={verticalListSortingStrategy}
                        >
                            {sections.map((section) => (
                                <SortableSection
                                    key={section.id}
                                    section={section}
                                    collapsed={collapsed.has(section.id)}
                                    quotes={quotes}
                                    selectedSymbol={selectedSymbol}
                                    atLimit={itemCount >= maxItems}
                                    isBusy={isBusy}
                                    onSelectSymbol={onSelectSymbol}
                                    onToggle={() => toggleCollapsed(section.id)}
                                    onAdd={() => {
                                        setSymbolError(null);
                                        setSymbolSection(section);
                                    }}
                                    onRename={() => {
                                        setFormError(null);
                                        setEditSection(section);
                                    }}
                                    onDelete={() =>
                                        void onDeleteSection(
                                            section.id,
                                            section.name,
                                        )
                                    }
                                    onRemoveItem={onRemoveItem}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </section>

            <WatchlistFormModal
                open={createOpen}
                title={t('watchlist.section_new_title')}
                isSubmitting={isBusy}
                error={formError}
                onClose={() => setCreateOpen(false)}
                onSubmit={async (name) => {
                    try {
                        setFormError(null);
                        await onCreateSection(name);
                        setCreateOpen(false);
                    } catch (caught) {
                        setFormError(locoErrorMessage(caught));
                    }
                }}
            />
            <WatchlistFormModal
                open={Boolean(editSection)}
                title={t('watchlist.section_rename_title')}
                initialName={editSection?.name ?? ''}
                isSubmitting={isBusy}
                error={formError}
                onClose={() => setEditSection(null)}
                onSubmit={async (name) => {
                    if (!editSection) return;
                    try {
                        setFormError(null);
                        await onRenameSection(editSection.id, name);
                        setEditSection(null);
                    } catch (caught) {
                        setFormError(locoErrorMessage(caught));
                    }
                }}
            />
            <WatchlistSymbolDialog
                open={symbolSection !== null}
                section={symbolSection}
                isSubmitting={isBusy}
                error={symbolError}
                onClose={() => setSymbolSection(null)}
                onAdd={async (sectionId, symbol) => {
                    try {
                        setSymbolError(null);
                        await onAddItem(sectionId, symbol);
                        setSymbolSection(null);
                    } catch (caught) {
                        setSymbolError(locoErrorMessage(caught));
                    }
                }}
            />
        </>
    );
}

type SortableSectionProps = {
    section: WatchlistSectionDto;
    collapsed: boolean;
    quotes: Record<string, QuoteDto>;
    selectedSymbol: string;
    atLimit: boolean;
    isBusy: boolean;
    onSelectSymbol: (symbol: string) => void;
    onToggle: () => void;
    onAdd: () => void;
    onRename: () => void;
    onDelete: () => void;
    onRemoveItem: (itemId: number, symbol: string) => Promise<void>;
};

function SortableSection({
    section,
    collapsed,
    quotes,
    selectedSymbol,
    atLimit,
    isBusy,
    onSelectSymbol,
    onToggle,
    onAdd,
    onRename,
    onDelete,
    onRemoveItem,
}: SortableSectionProps) {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const sortable = useSortable({
        id: sectionDragId(section.id),
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
                'border-b border-gray-100 last:border-b-0 dark:border-white/10',
                sortable.isDragging && 'z-10 opacity-60 shadow',
            )}
        >
            <div className="flex items-center gap-1 bg-gray-50/80 px-1 py-1 dark:bg-white/5">
                <button
                    type="button"
                    ref={sortable.setActivatorNodeRef}
                    {...sortable.attributes}
                    {...sortable.listeners}
                    className="cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-white/10"
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
                    <span className="truncate text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-white/50">
                        {section.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {section.items.length}
                    </span>
                </button>
                <button
                    type="button"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-white/10"
                    onClick={onAdd}
                    disabled={atLimit || isBusy}
                    title={t('watchlist.add_to_section', {
                        section: section.name,
                    })}
                    aria-label={t('watchlist.add_to_section', {
                        section: section.name,
                    })}
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="relative">
                    <button
                        type="button"
                        className="dropdown-toggle rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={t('watchlist.rename')}
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    <Dropdown
                        isOpen={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        className="right-0 min-w-36 p-1"
                    >
                        <DropdownItem
                            onClick={() => {
                                setMenuOpen(false);
                                onRename();
                            }}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                        >
                            <Pencil className="h-4 w-4" />
                            {t('watchlist.rename')}
                        </DropdownItem>
                        {!section.is_default && (
                            <DropdownItem
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDelete();
                                }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                                <Trash2 className="h-4 w-4" />
                                {t('watchlist.delete')}
                            </DropdownItem>
                        )}
                    </Dropdown>
                </div>
            </div>

            {!collapsed && (
                <SortableContext
                    items={section.items.map((item) => itemDragId(item.id))}
                    strategy={verticalListSortingStrategy}
                >
                    {section.items.length === 0 ? (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="w-full px-4 py-4 text-center text-xs text-gray-500 hover:bg-gray-50 dark:text-white/50 dark:hover:bg-white/5"
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
                                        quote={quotes[symbol] ?? null}
                                        selected={selectedSymbol === symbol}
                                        onSelect={() => onSelectSymbol(symbol)}
                                        onRemove={() =>
                                            void onRemoveItem(
                                                item.id,
                                                item.instrument.symbol,
                                            )
                                        }
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
