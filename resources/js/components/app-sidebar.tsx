import { Link } from '@inertiajs/react';
import {
    Calculator,
    LayoutGrid,
    Newspaper,
    PieChart,
    Star,
    Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types/navigation';
import { dashboard } from '@/routes';
import { show as budgetShow } from '@/routes/budget';
import { show as calculatorShow } from '@/routes/calculator';
import { index as watchlistsIndex } from '@/routes/watchlists';

export function AppSidebar() {
    const { t } = useTranslation();

    const mainNavItems: NavItem[] = [
        {
            title: t('nav.dashboard'),
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: t('nav.statistics'),
            href: '/statistics',
            icon: PieChart,
        },
        {
            title: t('nav.budget'),
            href: budgetShow().url,
            icon: Wallet,
        },
        {
            title: t('nav.calculator'),
            href: calculatorShow().url,
            icon: Calculator,
        },
        {
            title: t('nav.news'),
            href: '/news',
            icon: Newspaper,
        },
        {
            title: t('nav.watchlist'),
            href: watchlistsIndex().url,
            icon: Star,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
