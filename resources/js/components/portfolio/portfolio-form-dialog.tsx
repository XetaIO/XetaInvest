import { useForm } from '@inertiajs/react';
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
import {
    store as storePortfolio,
    update as updatePortfolio,
} from '@/routes/portfolios';
import type { PortfolioSummary } from '@/types/portfolio';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    portfolio?: PortfolioSummary | null;
};

export function PortfolioFormDialog({ open, onOpenChange, portfolio }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && (
                <PortfolioForm
                    key={portfolio?.id ?? 'new'}
                    portfolio={portfolio}
                    onClose={() => onOpenChange(false)}
                />
            )}
        </Dialog>
    );
}

type FormProps = {
    portfolio?: PortfolioSummary | null;
    onClose: () => void;
};

function PortfolioForm({ portfolio, onClose }: FormProps) {
    const { t } = useTranslation();
    const isEdit = !!portfolio;
    const form = useForm<{ name: string; is_default: boolean }>({
        name: portfolio?.name ?? '',
        is_default: portfolio?.is_default ?? false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isEdit && portfolio) {
            form.patch(updatePortfolio(portfolio.id).url, {
                preserveScroll: true,
                onSuccess: onClose,
            });
        } else {
            form.post(storePortfolio().url, {
                preserveScroll: true,
                onSuccess: onClose,
            });
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {isEdit ? t('portfolio.edit_title') : t('portfolio.new')}
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
                        onChange={(e) => form.setData('name', e.target.value)}
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
                        onCheckedChange={(checked) =>
                            form.setData('is_default', checked === true)
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
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        {isEdit ? t('portfolio.update') : t('portfolio.create')}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}
