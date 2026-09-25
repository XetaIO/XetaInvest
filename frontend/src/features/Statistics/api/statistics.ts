import { queryOptions } from '@tanstack/react-query';
import type { StatisticsResponse } from '../../../bindings/StatisticsResponse';
import { get } from '../../../shared/api/client';
import type { RequestOptions } from '../../../shared/api/client';

export const STATISTICS_QUERY_KEY = ['statistics'] as const;

/** `all`, or the id of one of the user's portfolios. */
export type StatisticsScopeParam = 'all' | number;

/**
 * Loads the statistics payload of a scope.
 *
 * @param scope `all` or a portfolio id.
 * @param refresh Rebuild the server-side cache with fresh quotes.
 * @param options Abort signal from React Query.
 */
export async function fetchStatistics(
    scope: StatisticsScopeParam,
    refresh = false,
    options?: RequestOptions,
): Promise<StatisticsResponse> {
    const query = new URLSearchParams({ portfolio: String(scope) });
    if (refresh) {
        query.set('refresh', 'true');
    }
    return get<StatisticsResponse>(`/api/statistics?${query}`, options);
}

export function statisticsQueryOptions(scope: StatisticsScopeParam) {
    return queryOptions({
        queryKey: [...STATISTICS_QUERY_KEY, scope] as const,
        queryFn: ({ signal }) => fetchStatistics(scope, false, { signal }),
        staleTime: 60_000,
    });
}
