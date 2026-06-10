import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SymbolSearchDialog } from '@/components/symbol-search-dialog';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocale } from '@/hooks/use-locale';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types/navigation';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [searchOpen, setSearchOpen] = useState(false);
    const { t } = useTranslation();
    useLocale();

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setSearchOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex flex-1 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <LanguageSwitcher />
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="ml-auto inline-flex items-center gap-2 text-muted-foreground"
                aria-label={t('search.aria_label')}
            >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">
                    {t('search.placeholder')}
                </span>
                <kbd className="pointer-events-none hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none md:inline-flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <SymbolSearchDialog
                open={searchOpen}
                onOpenChange={setSearchOpen}
            />
        </header>
    );
}
