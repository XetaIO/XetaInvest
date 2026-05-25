import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Watchlist } from '@/types';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    watchlist?: Watchlist | null;
};

export function WatchlistFormDialog({ open, onOpenChange, watchlist }: Props) {
    const isEdit = !!watchlist;
    const form = useForm<{ name: string }>({ name: watchlist?.name ?? '' });

    useEffect(() => {
        if (open) {
            form.setData({ name: watchlist?.name ?? '' });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, watchlist?.id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const onSuccess = () => onOpenChange(false);

        if (isEdit && watchlist) {
            form.patch(`/watchlists/${watchlist.id}`, { preserveScroll: true, onSuccess });
        } else {
            form.post('/watchlists', { preserveScroll: true, onSuccess });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Renommer la liste' : 'Nouvelle liste de suivi'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wl-name">Nom</Label>
                        <Input
                            id="wl-name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            autoFocus
                            required
                            maxLength={60}
                        />
                        {form.errors.name && <p className="text-xs text-rose-500">{form.errors.name}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit ? 'Renommer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
