import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../shared/components/form/input/InputField';
import { Label } from '../../../shared/components/form/Label';
import { Button } from '../../../shared/components/ui/button/Button';
import { Modal } from '../../../shared/components/ui/modal/Modal';

type Props = {
    open: boolean;
    title: string;
    initialName?: string;
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (name: string) => void;
};

export function WatchlistFormModal({
    open,
    title,
    initialName = '',
    isSubmitting,
    error,
    onClose,
    onSubmit,
}: Props) {
    const { t } = useTranslation();
    const [name, setName] = useState(initialName);

    useEffect(() => {
        if (!open) {
            return;
        }
        setName(initialName);
    }, [open, initialName]);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        onSubmit(name.trim());
    }

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-lg p-6">
            <h2 className="pr-12 text-lg font-semibold text-gray-800 dark:text-white/90">
                {title}
            </h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                    <Label htmlFor="watchlist-name">
                        {t('watchlist.name')}
                    </Label>
                    <Input
                        id="watchlist-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoFocus
                        required
                    />
                </div>
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
                    <Button
                        type="submit"
                        size="sm"
                        isLoading={isSubmitting}
                        disabled={!name.trim()}
                    >
                        {t('common.save')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
