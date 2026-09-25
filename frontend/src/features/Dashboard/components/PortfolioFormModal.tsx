import { Edit, Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PortfolioDto } from '../../../bindings/PortfolioDto';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { Modal } from '../../../shared/components/ui/modal/Modal';

type Props = {
    open: boolean;
    onClose: () => void;
    portfolio?: PortfolioDto | null;
    isSubmitting: boolean;
    error: string | null;
    onSubmit: (payload: { name: string; is_default: boolean }) => void;
};

export function PortfolioFormModal({
    open,
    onClose,
    portfolio,
    isSubmitting,
    error,
    onSubmit,
}: Props) {
    const { t } = useTranslation();
    const isEdit = Boolean(portfolio);
    const [name, setName] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setName(portfolio?.name ?? '');
        setIsDefault(portfolio?.is_default ?? false);
    }, [open, portfolio]);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        onSubmit({ name: name.trim(), is_default: isDefault });
    }

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-lg p-6">
            <h2 className="pr-12 text-lg font-semibold text-gray-800 dark:text-white/90">
                {isEdit ? t('portfolio.edit_title') : t('portfolio.new')}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                    <Label htmlFor="portfolio-name">
                        {t('portfolio.name')}
                    </Label>
                    <Input
                        id="portfolio-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoFocus
                        required
                    />
                </div>
                <label
                    htmlFor="portfolio-default"
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                    <input
                        id="portfolio-default"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-400 dark:border-white/20 dark:bg-mist-950"
                        checked={isDefault}
                        onChange={(event) => setIsDefault(event.target.checked)}
                    />
                    {t('portfolio.is_default')}
                </label>
                {error && <p className="text-xs text-rose-500">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={onClose}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" size="sm" isLoading={isSubmitting}>
                        {isEdit ? (
                            <>
                                <Edit className="h-4 w-4" />{' '}
                                {t('portfolio.update')}
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />{' '}
                                {t('portfolio.create')}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
