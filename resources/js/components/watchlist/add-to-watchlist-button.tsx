import { router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch } from '@/lib/api';
import type { WatchlistSummary } from '@/types';

type Props = {
    symbol: string;
    variant?: 'ghost' | 'outline' | 'default';
    size?: 'sm' | 'default' | 'icon';
};

export function AddToWatchlistButton({ symbol, variant = 'outline', size = 'sm' }: Props) {
    const [open, setOpen] = useState(false);
    const [lists, setLists] = useState<WatchlistSummary[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || lists !== null) {
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const payload = await apiFetch<{ data: WatchlistSummary[] }>('/api/watchlists/summary');

                if (!cancelled) {
                    setLists(payload.data);
                }
            } catch {
                if (!cancelled) {
                    setLists([]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, lists]);

    const addTo = (watchlistId: string) => {
        setLoading(true);

        router.post(
            `/watchlists/${watchlistId}/items`,
            { symbol },
            {
                preserveScroll: true,
                onFinish: () => {
                    setLoading(false);
                    setOpen(false);
                },
            },
        );
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size}>
                    <Plus className="mr-1 h-4 w-4" /> Watchlist
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Ajouter à une liste</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {lists === null && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">Chargement...</div>
                )}

                {lists !== null && lists.length === 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                        Aucune liste. Créez-en une depuis la page Watchlist.
                    </div>
                )}

                {lists !== null &&
                    lists.map((l) => (
                        <DropdownMenuItem
                            key={l.id}
                            disabled={loading}
                            onSelect={(e) => {
                                e.preventDefault();
                                addTo(l.id);
                            }}
                        >
                            {l.name}
                        </DropdownMenuItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
