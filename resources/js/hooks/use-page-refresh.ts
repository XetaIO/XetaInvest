import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';

/**
 * Encapsulates the "manual page refresh" pattern used in Statistics and Dashboard.
 *
 * @param buildUrl  Factory that returns the URL to visit (should include `refresh=1` when needed).
 * @param only      Inertia `only` array — props to reload from the server.
 */
export function usePageRefresh(
    buildUrl: () => string,
    only: string[],
): { isRefreshing: boolean; refresh: () => void } {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refresh = useCallback(() => {
        setIsRefreshing(true);
        router.visit(buildUrl(), {
            preserveScroll: true,
            only,
            onFinish: () => {
                setIsRefreshing(false);
            },
        });
    }, [buildUrl, only]);

    return { isRefreshing, refresh };
}
