import { router } from '@inertiajs/react';
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
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { PortfolioSummary } from '@/types/portfolio';
import { PortfolioFormDialog } from './portfolio-form-dialog';
import { dashboard } from '@/routes';
import {
    destroy as destroyPortfolio,
    defaultMethod as setDefaultPortfolio,
} from '@/routes/portfolios';

type Props = {
    portfolios: PortfolioSummary[];
    active: PortfolioSummary | null;
};

export function PortfolioSwitcher({ portfolios, active }: Props) {
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<PortfolioSummary | null>(null);
    const [open, setOpen] = useState(false);

    const handleSelect = (p: PortfolioSummary) => {
        setOpen(false);

        if (p.id === active?.id) {
            return;
        }

        router.visit(dashboard({ query: { portfolio: String(p.id) } }).url, {
            preserveScroll: true,
        });
    };

    const handleSetDefault = (p: PortfolioSummary) => {
        const r = setDefaultPortfolio(p.id);
        router.patch(r.url, {}, { preserveScroll: true });
    };

    const handleDelete = (p: PortfolioSummary) => {
        if (
            !confirm(
                t('portfolio.delete_confirm', {
                    name: p.name,
                }),
            )
        ) {
            return;
        }

        const r = destroyPortfolio(p.id);
        router.delete(r.url, {
            preserveScroll: true,
            onError: () => toast.error(t('portfolio.delete_error')),
        });
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="min-w-[220px] justify-between"
                    >
                        <span className="flex items-center gap-2 truncate">
                            {active?.is_default && (
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            )}
                            <span className="truncate">
                                {active?.name ?? t('portfolio.no_portfolio')}
                            </span>
                        </span>
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[260px]">
                    <DropdownMenuLabel>
                        {t('portfolio.portfolios')}
                    </DropdownMenuLabel>
                    {portfolios.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {t('portfolio.no_portfolio')}
                        </div>
                    )}
                    {portfolios.map((p) => (
                        <DropdownMenuItem
                            key={p.id}
                            className="group flex items-center justify-between gap-2"
                            onSelect={(e) => {
                                e.preventDefault();
                                handleSelect(p);
                            }}
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Check
                                    className={cn(
                                        'h-4 w-4',
                                        active?.id === p.id
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                                <span className="truncate">{p.name}</span>
                                {p.is_default && (
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                )}
                            </span>
                            <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {!p.is_default && (
                                    <button
                                        type="button"
                                        className="rounded p-1 hover:bg-accent"
                                        title={t('portfolio.set_default')}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSetDefault(p);
                                        }}
                                    >
                                        <Star className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="rounded p-1 hover:bg-accent"
                                    title={t('portfolio.edit')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditTarget(p);
                                        setOpen(false);
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    className="rounded p-1 hover:bg-accent"
                                    title={t('portfolio.delete')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(p);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                </button>
                            </span>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setCreateOpen(true);
                            setOpen(false);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('portfolio.new')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <PortfolioFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            <PortfolioFormDialog
                open={editTarget !== null}
                onOpenChange={(o) => !o && setEditTarget(null)}
                portfolio={editTarget}
            />
        </>
    );
}
