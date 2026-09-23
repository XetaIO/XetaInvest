import { queryOptions } from '@tanstack/react-query';
import type { SymbolChartResponse } from '../../../bindings/SymbolChartResponse';
import type { SymbolPageResponse } from '../../../bindings/SymbolPageResponse';
import { get } from '../../../shared/api/client';
import type { RequestOptions } from '../../../shared/api/client';

export const SYMBOL_QUERY_KEY = ['symbol'] as const;

/**
 * Loads quote, default chart, news, and similar symbols.
 *
 * @param symbol Path ticker (`AAPL`, `PE500.PA`).
 * @param options Abort signal from React Query.
 */
export async function fetchSymbolPage(
    symbol: string,
    options?: RequestOptions,
): Promise<SymbolPageResponse> {
    return get<SymbolPageResponse>(
        `/api/symbols/${encodeURIComponent(symbol)}`,
        options,
    );
}

/**
 * Reloads one chart window when the user changes the range.
 *
 * @param symbol Path ticker.
 * @param range Window key (`1mo`, `1y`, …).
 * @param options Abort signal.
 */
export async function fetchSymbolChart(
    symbol: string,
    range: string,
    options?: RequestOptions,
): Promise<SymbolChartResponse> {
    const query = new URLSearchParams({ range });
    return get<SymbolChartResponse>(
        `/api/symbols/${encodeURIComponent(symbol)}/chart?${query.toString()}`,
        options,
    );
}

export function symbolPageQueryOptions(symbol: string) {
    return queryOptions({
        queryKey: [...SYMBOL_QUERY_KEY, symbol] as const,
        queryFn: ({ signal }) => fetchSymbolPage(symbol, { signal }),
        staleTime: 30_000,
    });
}
