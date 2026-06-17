import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { AUTO_REFRESH_INTERVAL_MS } from '@/lib/constants';
import { dashboard } from '@/routes';

export function useDashboardRefresh(portfolioId: number | undefined) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!portfolioId) {
            return;
        }

        const id = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({ only: ['active'] });
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(id);
    }, [portfolioId]);

    const refresh = useCallback(() => {
        if (!portfolioId) {
            return;
        }

        setIsRefreshing(true);
        router.visit(
            dashboard({
                query: { portfolio: String(portfolioId), refresh: '1' },
            }).url,
            {
                preserveScroll: true,
                only: ['active'],
                onFinish: () => setIsRefreshing(false),
            },
        );
    }, [portfolioId]);

    return { isRefreshing, refresh };
}
