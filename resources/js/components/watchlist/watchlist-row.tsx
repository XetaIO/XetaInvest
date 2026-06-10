import { Link, router } from '@inertiajs/react';
import { Eye, EyeOff, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatSignedPercent } from '@/lib/format';
import type { PriceUpdate, WatchlistItem } from '@/types/watchlist';

type Props = {
    item: WatchlistItem;
    price: PriceUpdate | null;
    visible: boolean;
    color: string;
    onToggleVisible: () => void;
};

export function WatchlistRow({
    item,
    price,
    visible,
    color,
    onToggleVisible,
}: Props) {
    const { i18n } = useTranslation();
    const loc = i18n.resolvedLanguage ?? 'fr';
    const formatPrice = (n: number, currency: string | null) =>
        new Intl.NumberFormat(loc, {
            style: 'currency',
            currency: currency ?? 'USD',
            maximumFractionDigits: 4,
        }).format(n);
    const change = price?.change ?? 0;
    const changePct = price?.change_percent ?? 0;
    const isUp = change >= 0;

    const remove = () => {
        if (!confirm(`Retirer ${item.instrument.symbol} de la liste ?`)) {
            return;
        }

        router.delete(`/watchlist-items/${item.id}`, { preserveScroll: true });
    };

    return (
        <li className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
            <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{
                    backgroundColor: visible ? color : 'transparent',
                    borderColor: color,
                    borderWidth: 2,
                }}
                aria-hidden
            />

            <div className="min-w-0 flex-1">
                <Link
                    href={`/symbol/${encodeURIComponent(item.instrument.symbol)}`}
                    className="font-medium hover:underline"
                >
                    {item.instrument.symbol}
                </Link>
                {item.instrument.name && (
                    <p className="truncate text-xs text-muted-foreground">
                        {item.instrument.name}
                    </p>
                )}
            </div>

            <div className="text-right">
                {price ? (
                    <>
                        <div className="font-mono text-sm tabular-nums">
                            {formatPrice(price.price, item.instrument.currency)}
                        </div>
                        <div
                            className={`flex items-center justify-end gap-1 text-xs tabular-nums ${
                                isUp ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                        >
                            {isUp ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : (
                                <TrendingDown className="h-3 w-3" />
                            )}
                            {formatSignedPercent(changePct)}
                        </div>
                    </>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                )}
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onToggleVisible}
                title={
                    visible
                        ? 'Masquer du graphique'
                        : 'Afficher sur le graphique'
                }
            >
                {visible ? (
                    <Eye className="h-4 w-4" />
                ) : (
                    <EyeOff className="h-4 w-4" />
                )}
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={remove}
                title="Retirer"
            >
                <Trash2 className="h-4 w-4 text-rose-500" />
            </Button>
        </li>
    );
}
