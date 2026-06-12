/* eslint-disable react-hooks/refs */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link, router } from '@inertiajs/react';
import { ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { calculateSessionChange } from '@/lib/watchlist';
import type { PriceUpdate, WatchlistItem } from '@/types/watchlist';

type Props = {
    item: WatchlistItem;
    price: PriceUpdate | null;
    selected: boolean;
    onSelect: () => void;
};

export function WatchlistRow({ item, price, selected, onSelect }: Props) {
    const { t, i18n } = useTranslation();
    const sortable = useSortable({
        id: item.id,
        data: { type: 'item', sectionId: item.section_id },
    });
    const sessionChange = calculateSessionChange(price);
    const locale = i18n.resolvedLanguage ?? 'fr';
    const number = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const percent = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
    });
    const changeTone =
        sessionChange === null
            ? 'text-muted-foreground'
            : sessionChange.change >= 0
              ? 'text-emerald-500'
              : 'text-rose-500';

    const remove = () => {
        if (
            !confirm(
                t('watchlist.remove_confirm', {
                    symbol: item.instrument.symbol,
                }),
            )
        ) {
            return;
        }

        router.delete(`/watchlist-items/${item.id}`, { preserveScroll: true });
    };

    return (
        <li
            ref={sortable.setNodeRef}
            style={{
                transform: CSS.Transform.toString(sortable.transform),
                transition: sortable.transition,
            }}
            className={cn(
                'grid grid-cols-[minmax(120px,1fr)_90px_80px_80px_64px] items-center border-b text-sm last:border-b-0',
                selected && 'bg-accent/60',
                sortable.isDragging && 'z-20 opacity-60 shadow-sm',
            )}
        >
            <div className="flex min-w-0 items-center gap-1 px-1 py-1.5">
                <button
                    type="button"
                    ref={sortable.setActivatorNodeRef}
                    {...sortable.attributes}
                    {...sortable.listeners}
                    className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                    aria-label={t('watchlist.drag_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onSelect}
                    className="min-w-0 flex-1 text-left"
                >
                    <span className="block truncate font-medium hover:underline">
                        {item.instrument.symbol}
                    </span>
                    {item.instrument.name && (
                        <span className="block truncate text-xs text-muted-foreground">
                            {item.instrument.name}
                        </span>
                    )}
                </button>
            </div>
            <button
                type="button"
                onClick={onSelect}
                className="px-2 py-2 text-right font-mono tabular-nums"
            >
                {price ? number.format(price.price) : '—'}
            </button>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'px-2 py-2 text-right font-mono tabular-nums',
                    changeTone,
                )}
            >
                {sessionChange ? percent.format(sessionChange.change) : '—'}
            </button>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'px-2 py-2 text-right font-mono tabular-nums',
                    changeTone,
                )}
            >
                {sessionChange
                    ? `${percent.format(sessionChange.changePercent)}%`
                    : '—'}
            </button>
            <div className="flex items-center justify-end pr-1">
                <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                    <Link
                        href={`/symbol/${encodeURIComponent(item.instrument.symbol)}`}
                        title={t('watchlist.open_symbol', {
                            symbol: item.instrument.symbol,
                        })}
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={remove}
                    title={t('watchlist.remove_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </Button>
            </div>
        </li>
    );
}
