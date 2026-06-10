import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PortfolioSummary } from '@/types/portfolio';
import {
    store as storePortfolio,
    update as updatePortfolio,
} from '@/routes/portfolios';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    portfolio?: PortfolioSummary | null;
};

export function PortfolioFormDialog({ open, onOpenChange, portfolio }: Props) {
    const { t } = useTranslation();
    const isEdit = !!portfolio;
    const form = useForm<{ name: string; is_default: boolean }>({
        name: portfolio?.name ?? '',
        is_default: portfolio?.is_default ?? false,
    });

    useEffect(() => {
        if (open) {
            form.setData({
                name: portfolio?.name ?? '',
                is_default: portfolio?.is_default ?? false,
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, portfolio?.id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const onSuccess = () => onOpenChange(false);

        if (isEdit && portfolio) {
            form.patch(updatePortfolio(portfolio.id).url, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post(storePortfolio().url, {
                preserveScroll: true,
                onSuccess,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit
                            ? t('portfolio.edit_title')
                            : t('portfolio.new')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="portfolio-name">
                            {t('portfolio.name')}
                        </Label>
                        <Input
                            id="portfolio-name"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                            autoFocus
                            required
                            maxLength={255}
                        />
                        {form.errors.name && (
                            <p className="text-xs text-rose-500">
                                {form.errors.name}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="portfolio-default"
                            checked={form.data.is_default}
                            onCheckedChange={(c) =>
                                form.setData('is_default', c === true)
                            }
                        />
                        <Label
                            htmlFor="portfolio-default"
                            className="cursor-pointer"
                        >
                            {t('portfolio.is_default')}
                        </Label>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {isEdit
                                ? t('portfolio.update')
                                : t('portfolio.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
