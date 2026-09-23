import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Check,
    ChevronsUpDown,
    Pencil,
    Plus,
    Star,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { DashboardPortfolioSummary } from '../../../bindings/DashboardPortfolioSummary';
import type { PortfolioDto } from '../../../bindings/PortfolioDto';
import { locoErrorMessage } from '../../../shared/api/client';
import { Button } from '../../../shared/components/ui/button/Button';
import { Dropdown } from '../../../shared/components/ui/dropdown/Dropdown';
import { cn } from '../../../shared/utils/twMerge';
import {
    createPortfolio,
    deletePortfolio,
    setDefaultPortfolio,
    updatePortfolio,
} from '../api/dashboard';
import { PortfolioFormModal } from './PortfolioFormModal';

type Props = {
    portfolios: PortfolioDto[];
    active: DashboardPortfolioSummary | null;
    onSelect: (portfolioId: number) => void;
};

function displayName(
    name: string | null | undefined,
    fallback: string,
): string {
    const trimmed = name?.trim();
    return trimmed ? trimmed : fallback;
}

export function PortfolioSwitcher({ portfolios, active, onSelect }: Props) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<PortfolioDto | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const untitled = t('dashboard.untitled');
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    const save = useMutation({
        mutationFn: (payload: { name: string; is_default: boolean }) =>
            editTarget
                ? updatePortfolio(editTarget.id, {
                      name: payload.name,
                      is_default: payload.is_default,
                  })
                : createPortfolio(payload),
        onSuccess: (created) => {
            setFormError(null);
            setFormOpen(false);
            setEditTarget(null);
            if (!editTarget) {
                onSelect(created.id);
            }
            void invalidate();
        },
        onError: (error) => setFormError(locoErrorMessage(error)),
    });

    const makeDefault = useMutation({
        mutationFn: (id: number) => setDefaultPortfolio(id),
        onSuccess: () => {
            void invalidate();
        },
        onError: (error) => toast.error(locoErrorMessage(error)),
    });

    const remove = useMutation({
        mutationFn: (id: number) => deletePortfolio(id),
        onSuccess: (_void, id) => {
            if (active?.id === id) {
                onSelect(0);
            }
            void invalidate();
        },
        onError: () => toast.error(t('portfolio.delete_error')),
    });

    function closeMenu() {
        setOpen(false);
    }

    function openCreate() {
        setEditTarget(null);
        setFormError(null);
        setFormOpen(true);
        closeMenu();
    }

    function openEdit(portfolio: PortfolioDto) {
        setEditTarget(portfolio);
        setFormError(null);
        setFormOpen(true);
        closeMenu();
    }

    function handleDelete(portfolio: PortfolioDto) {
        if (
            !confirm(
                t('portfolio.delete_confirm', {
                    name: displayName(portfolio.name, untitled),
                }),
            )
        ) {
            return;
        }
        remove.mutate(portfolio.id);
    }

    function handleSelect(portfolio: PortfolioDto) {
        closeMenu();
        if (portfolio.id !== active?.id) {
            onSelect(portfolio.id);
        }
    }

    return (
        <>
            <div className="relative">
                <button
                    type="button"
                    className="dropdown-toggle inline-flex min-w-55 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 hover:cursor-pointer hover:bg-gray-50 dark:border-white/10 dark:bg-mist-950 dark:text-white/90 dark:hover:bg-white/5"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    onClick={() => setOpen((current) => !current)}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {active?.is_default && (
                            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                        )}
                        <span className="truncate">
                            {active
                                ? displayName(active.name, untitled)
                                : t('portfolio.no_portfolio')}
                        </span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
                <Dropdown
                    isOpen={open}
                    onClose={closeMenu}
                    className="left-0 w-65 p-3 lg:right-auto"
                >
                    <p className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-white/45">
                        {t('portfolio.portfolios')}
                    </p>
                    {portfolios.length === 0 && (
                        <p className="px-2 py-1.5 text-sm text-gray-500 dark:text-white/50">
                            {t('portfolio.no_portfolio')}
                        </p>
                    )}
                    <ul className="max-h-72 overflow-y-auto">
                        {portfolios.map((portfolio) => (
                            <li
                                key={portfolio.id}
                                className="group flex items-center gap-1 rounded-md px-1 hover:bg-gray-50 dark:hover:bg-white/5"
                            >
                                <button
                                    type="button"
                                    className={cn(
                                        'flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-400',
                                        active?.id === portfolio.id
                                            ? 'hover:cursor-auto'
                                            : 'hover:cursor-pointer',
                                    )}
                                    onClick={() => handleSelect(portfolio)}
                                >
                                    <Check
                                        className={cn(
                                            'h-4 w-4 shrink-0',
                                            active?.id === portfolio.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="truncate">
                                        {displayName(portfolio.name, untitled)}
                                    </span>
                                    {portfolio.is_default && (
                                        <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" />
                                    )}
                                </button>
                                <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                                    {!portfolio.is_default && (
                                        <button
                                            type="button"
                                            className="rounded p-1 text-gray-500 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                                            title={t('portfolio.set_default')}
                                            onClick={() =>
                                                makeDefault.mutate(portfolio.id)
                                            }
                                        >
                                            <Star className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="rounded p-1 text-gray-500 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                                        title={t('portfolio.edit')}
                                        onClick={() => openEdit(portfolio)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded p-1 text-gray-500 hover:cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                                        title={t('portfolio.delete')}
                                        onClick={() => handleDelete(portfolio)}
                                    >
                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-1 border-t border-gray-200 dark:border-white/10">
                        <Button
                            type="button"
                            size="xs"
                            variant="transparent"
                            className="mt-3 w-full justify-start px-4 py-2 text-brand-500"
                            onClick={openCreate}
                        >
                            <Plus className="h-5 w-5" />
                            {t('portfolio.new')}
                        </Button>
                    </div>
                </Dropdown>
            </div>

            <PortfolioFormModal
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditTarget(null);
                    setFormError(null);
                }}
                portfolio={editTarget}
                isSubmitting={save.isPending}
                error={formError}
                onSubmit={(payload) => save.mutate(payload)}
            />
        </>
    );
}
