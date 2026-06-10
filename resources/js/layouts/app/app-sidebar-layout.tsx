import { lazy, Suspense } from 'react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types/ui';

const AiChatWidget = lazy(() =>
    import('@/components/ai/ai-chat-widget').then((module) => ({
        default: module.AiChatWidget,
    })),
);

const PortfolioTicker = lazy(() =>
    import('@/components/portfolio-ticker').then((module) => ({
        default: module.PortfolioTicker,
    })),
);

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <Suspense fallback={null}>
                    <PortfolioTicker />
                </Suspense>
                {children}
            </AppContent>
            <Suspense fallback={null}>
                <AiChatWidget />
            </Suspense>
        </AppShell>
    );
}
