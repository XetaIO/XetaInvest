import { queryOptions } from '@tanstack/react-query';
import type { AddWatchlistItem } from '../../../bindings/AddWatchlistItem';
import type { AddWatchlistItemResponse } from '../../../bindings/AddWatchlistItemResponse';
import type { CreateWatchlist } from '../../../bindings/CreateWatchlist';
import type { CreateWatchlistSection } from '../../../bindings/CreateWatchlistSection';
import type { QuotesResponse } from '../../../bindings/QuotesResponse';
import type { ReorderWatchlist } from '../../../bindings/ReorderWatchlist';
import type { UpdateWatchlist } from '../../../bindings/UpdateWatchlist';
import type { UpdateWatchlistSection } from '../../../bindings/UpdateWatchlistSection';
import type { WatchlistHistoryResponse } from '../../../bindings/WatchlistHistoryResponse';
import type { WatchlistPageResponse } from '../../../bindings/WatchlistPageResponse';
import type { WatchlistSummaryResponse } from '../../../bindings/WatchlistSummaryResponse';
import { del, get, patch, post, put } from '../../../shared/api/client';
import type { RequestOptions } from '../../../shared/api/client';

export const WATCHLIST_QUERY_KEY = ['watchlists'] as const;
export const WATCHLIST_SUMMARY_KEY = ['watchlists', 'summary'] as const;

export async function fetchWatchlists(
    watchlistId = 0,
    options?: RequestOptions,
): Promise<WatchlistPageResponse> {
    const query = new URLSearchParams();
    if (watchlistId > 0) query.set('watchlist', String(watchlistId));
    const suffix = query.toString();
    return get<WatchlistPageResponse>(
        `/api/watchlists${suffix ? `?${suffix}` : ''}`,
        options,
    );
}

export function watchlistsQueryOptions(watchlistId = 0) {
    return queryOptions({
        queryKey: [...WATCHLIST_QUERY_KEY, watchlistId] as const,
        queryFn: ({ signal }) => fetchWatchlists(watchlistId, { signal }),
        staleTime: 15_000,
    });
}

export async function fetchWatchlistSummary(
    options?: RequestOptions,
): Promise<WatchlistSummaryResponse> {
    return get<WatchlistSummaryResponse>('/api/watchlists/summary', options);
}

export function watchlistSummaryQueryOptions() {
    return queryOptions({
        queryKey: WATCHLIST_SUMMARY_KEY,
        queryFn: ({ signal }) => fetchWatchlistSummary({ signal }),
        staleTime: 15_000,
    });
}

export async function fetchWatchlistHistory(
    symbols: string[],
    options?: RequestOptions,
): Promise<WatchlistHistoryResponse> {
    if (symbols.length === 0) {
        return { data: {} };
    }
    const query = new URLSearchParams({ symbols: symbols.join(',') });
    return get<WatchlistHistoryResponse>(
        `/api/watchlists/history?${query.toString()}`,
        options,
    );
}

export function watchlistHistoryQueryOptions(symbols: string[]) {
    const key = [...symbols].map((symbol) => symbol.toUpperCase()).sort();
    return queryOptions({
        queryKey: ['watchlists', 'history', key] as const,
        queryFn: ({ signal }) => fetchWatchlistHistory(symbols, { signal }),
        enabled: symbols.length > 0,
        staleTime: 60_000,
    });
}

/**
 * One-shot snapshot for the watchlist table. Live prices then come from
 * `GET /api/stream` — do not poll this endpoint.
 */
export async function fetchQuotes(
    symbols: string[],
    options?: RequestOptions,
): Promise<QuotesResponse> {
    if (symbols.length === 0) {
        return { quotes: {}, fetched_at: new Date().toISOString() };
    }
    const query = new URLSearchParams({ symbols: symbols.join(',') });
    return get<QuotesResponse>(`/api/quotes?${query.toString()}`, options);
}

export function watchlistQuotesQueryOptions(symbols: string[]) {
    const key = [...symbols].map((symbol) => symbol.toUpperCase()).sort();
    return queryOptions({
        queryKey: ['watchlists', 'quotes', key] as const,
        queryFn: ({ signal }) => fetchQuotes(symbols, { signal }),
        enabled: symbols.length > 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function createWatchlist(
    body: CreateWatchlist,
): Promise<WatchlistPageResponse> {
    return post<WatchlistPageResponse>('/api/watchlists', body);
}

export function updateWatchlist(
    id: number,
    body: UpdateWatchlist,
): Promise<WatchlistPageResponse> {
    return put<WatchlistPageResponse>(`/api/watchlists/${id}`, body);
}

export function deleteWatchlist(id: number): Promise<void> {
    return del(`/api/watchlists/${id}`);
}

export function reorderWatchlist(
    id: number,
    body: ReorderWatchlist,
): Promise<WatchlistPageResponse> {
    return patch<WatchlistPageResponse>(`/api/watchlists/${id}/reorder`, body);
}

export function createWatchlistSection(
    watchlistId: number,
    body: CreateWatchlistSection,
): Promise<WatchlistPageResponse> {
    return post<WatchlistPageResponse>(
        `/api/watchlists/${watchlistId}/sections`,
        body,
    );
}

export function updateWatchlistSection(
    id: number,
    body: UpdateWatchlistSection,
): Promise<WatchlistPageResponse> {
    return put<WatchlistPageResponse>(`/api/watchlist-sections/${id}`, body);
}

export function deleteWatchlistSection(id: number): Promise<void> {
    return del(`/api/watchlist-sections/${id}`);
}

export function addWatchlistItem(
    watchlistId: number,
    body: AddWatchlistItem,
): Promise<AddWatchlistItemResponse> {
    return post<AddWatchlistItemResponse>(
        `/api/watchlists/${watchlistId}/items`,
        body,
    );
}

export function deleteWatchlistItem(id: number): Promise<void> {
    return del(`/api/watchlist-items/${id}`);
}
