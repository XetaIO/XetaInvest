/**
 * Centralized URL builders for pages that do not yet have Wayfinder-generated routes.
 * Keeps the URL construction logic out of page components.
 */

/**
 * Builds the Statistics page URL for a given portfolio scope.
 * Passing `refresh=true` appends `refresh=1` to trigger a live data fetch.
 */
export function buildStatisticsUrl(portfolio: string, refresh = false): string {
    const params = new URLSearchParams({ portfolio });

    if (refresh) {
        params.set('refresh', '1');
    }

    return `/statistics?${params.toString()}`;
}

/**
 * Builds the News page URL for a given symbol filter and page number.
 * Uses 'all' as the sentinel value meaning "no symbol filter".
 */
export function buildNewsUrl(symbol: string, page: number): string {
    const params = new URLSearchParams();

    if (symbol !== 'all') {
        params.set('symbol', symbol);
    }

    if (page > 1) {
        params.set('page', String(page));
    }

    const qs = params.toString();

    return qs ? `/news?${qs}` : '/news';
}
