import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
import type { WatchlistSection } from '@/types/watchlist';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    watchlistId: string;
    section?: WatchlistSection | null;
};

export function WatchlistSectionFormDialog({
    open,
    onOpenChange,
    watchlistId,
    section,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && (
                <WatchlistSectionForm
                    key={section?.id ?? 'new'}
                    watchlistId={watchlistId}
                    section={section}
                    onSuccess={() => onOpenChange(false)}
                />
            )}
        </Dialog>
    );
}

type FormProps = {
    watchlistId: string;
    section?: WatchlistSection | null;
    onSuccess: () => void;
};

function WatchlistSectionForm({ watchlistId, section, onSuccess }: FormProps) {
    const { t } = useTranslation();
    const form = useForm({ name: section?.name ?? '' });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess,
        };

        if (section) {
            form.patch(`/watchlist-sections/${section.id}`, options);
        } else {
            form.post(`/watchlists/${watchlistId}/sections`, options);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {section
                        ? t('watchlist.section_rename_title')
                        : t('watchlist.section_new_title')}
                </DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="watchlist-section-name">
                        {t('watchlist.section_name')}
                    </Label>
                    <Input
                        id="watchlist-section-name"
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        maxLength={60}
                        required
                        autoFocus
                    />
                    {form.errors.name && (
                        <p className="text-xs text-destructive">
                            {form.errors.name}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onSuccess}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {section ? t('watchlist.rename') : t('common.create')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
