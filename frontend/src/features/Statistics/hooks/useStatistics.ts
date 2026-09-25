import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { locoErrorMessage } from '../../../shared/api/client';
import { fetchStatistics, statisticsQueryOptions } from '../api/statistics';
import type { StatisticsScopeParam } from '../api/statistics';

/**
 * Statistics of `scope`, plus a `refresh` that rebuilds the server cache with
 * fresh quotes and swaps the result into the query cache.
 */
export function useStatistics(scope: StatisticsScopeParam) {
    const queryClient = useQueryClient();
    const options = statisticsQueryOptions(scope);
    const query = useQuery(options);
    const [isRefreshing, setIsRefreshing] = useState(false);

    async function refresh() {
        setIsRefreshing(true);
        try {
            const fresh = await fetchStatistics(scope, true);
            queryClient.setQueryData(options.queryKey, fresh);
        } catch (error) {
            toast.error(locoErrorMessage(error));
        } finally {
            setIsRefreshing(false);
        }
    }

    return { query, isRefreshing, refresh };
}
