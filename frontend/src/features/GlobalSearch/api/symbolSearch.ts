import { queryOptions } from '@tanstack/react-query';
import { get } from '../../../shared/api/client';
import type { RequestOptions } from '../../../shared/api/client';
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH } from '../types';
import type {
    SearchParams,
    SymbolSearchResponse,
    SymbolSearchResult,
} from '../types';

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 50;

/** Shared normalization for HTTP parameters and cache identity. */
export function normalizeSearchParams(
    params: SearchParams,
): Required<SearchParams> {
    const requestedLimit = params.limit ?? DEFAULT_SEARCH_LIMIT;
    return {
        q: params.q.trim(),
        region: params.region ?? 'FR',
        limit: Number.isFinite(requestedLimit)
            ? Math.max(
                  1,
                  Math.min(MAX_SEARCH_LIMIT, Math.trunc(requestedLimit)),
              )
            : DEFAULT_SEARCH_LIMIT,
    };
}

/** Fetch instruments through the shared client; let the caller handle errors. */
export async function searchSymbols(
    params: SearchParams,
    options?: RequestOptions,
): Promise<SymbolSearchResult[]> {
    const { q, region, limit } = normalizeSearchParams(params);
    if (q.length < MIN_SEARCH_LENGTH) return [];
    if (q.length > MAX_SEARCH_LENGTH)
        throw new Error('Search query is too long.');

    const query = new URLSearchParams({ q, limit: String(limit), region });
    const response = await get<SymbolSearchResponse>(
        '/api/symbol-search?' + query.toString(),
        options,
    );
    return response.data;
}

/** Reusable for useQuery, prefetchQuery and fetchQuery. Debounce belongs to the UI. */
export function symbolSearchOptions(params: SearchParams) {
    const normalized = normalizeSearchParams(params);
    return queryOptions({
        queryKey: ['symbol-search', normalized] as const,
        queryFn: ({ signal }) => searchSymbols(normalized, { signal }),
        enabled: normalized.q.length >= MIN_SEARCH_LENGTH,
        staleTime: 60_000,
        retry: false,
    });
}
