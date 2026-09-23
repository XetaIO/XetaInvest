import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import type { WatchlistItemDto } from '../../../bindings/WatchlistItemDto';
import { cn } from '../../../shared/utils/twMerge';
import { itemDragId } from '../lib/watchlistLayout';

type Props = {
    item: WatchlistItemDto;
    quote: QuoteDto | null;
    selected: boolean;
    onSelect: () => void;
    onRemove: () => void;
};

/**
 * One watchlist ticker row, including the drag handle (Laravel `WatchlistRow`).
 */
export function WatchlistRow({
    item,
    quote,
    selected,
    onSelect,
    onRemove,
}: Props) {
    const { t, i18n } = useTranslation();
    const sortable = useSortable({
        id: itemDragId(item.id),
        data: { type: 'item', sectionId: item.section_id },
    });
    const locale = i18n.resolvedLanguage ?? 'fr';
    const number = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const signed = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
    });
    const price = quote?.regular_market_price ?? null;
    const change = quote?.regular_market_change ?? null;
    const changePercent = quote?.regular_market_change_percent ?? null;
    const tone =
        change === null
            ? 'text-gray-500 dark:text-white/50'
            : change >= 0
              ? 'text-emerald-500'
              : 'text-rose-500';

    return (
        <li
            ref={sortable.setNodeRef}
            style={{
                transform: CSS.Transform.toString(sortable.transform),
                transition: sortable.transition,
            }}
            className={cn(
                'grid grid-cols-[minmax(120px,1fr)_90px_80px_80px_64px] items-center border-b border-gray-100 text-sm last:border-b-0 dark:border-white/10',
                selected && 'bg-brand-400/15 dark:bg-white/8',
                sortable.isDragging && 'z-20 opacity-60 shadow-sm',
            )}
        >
            <div className="flex min-w-0 items-center gap-1 px-1 py-1.5">
                <button
                    type="button"
                    ref={sortable.setActivatorNodeRef}
                    {...sortable.attributes}
                    {...sortable.listeners}
                    className="cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-white/10"
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
                    <span className="block truncate font-medium text-gray-900 hover:underline dark:text-white">
                        {item.instrument.symbol}
                    </span>
                    {item.instrument.name && (
                        <span className="block truncate text-xs text-gray-500 dark:text-white/50">
                            {item.instrument.name}
                        </span>
                    )}
                </button>
            </div>
            <button
                type="button"
                onClick={onSelect}
                className="font-mono px-2 py-2 text-right tabular-nums"
            >
                {price === null ? '—' : number.format(price)}
            </button>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'font-mono px-2 py-2 text-right tabular-nums',
                    tone,
                )}
            >
                {change === null ? '—' : signed.format(change)}
            </button>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    'font-mono px-2 py-2 text-right tabular-nums',
                    tone,
                )}
            >
                {changePercent === null
                    ? '—'
                    : `${signed.format(changePercent)}%`}
            </button>
            <div className="flex items-center justify-end pr-1">
                <Link
                    to={`/symbol/${encodeURIComponent(item.instrument.symbol)}`}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
                    title={t('watchlist.open_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                    aria-label={t('watchlist.open_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    title={t('watchlist.remove_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                    aria-label={t('watchlist.remove_symbol', {
                        symbol: item.instrument.symbol,
                    })}
                >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </button>
            </div>
        </li>
    );
}
