import { queryOptions } from '@tanstack/react-query';
import type { CreatePortfolio } from '../../../bindings/CreatePortfolio';
import type { CreatePosition } from '../../../bindings/CreatePosition';
import type { DashboardResponse } from '../../../bindings/DashboardResponse';
import type { PortfolioDto } from '../../../bindings/PortfolioDto';
import type { PositionDto } from '../../../bindings/PositionDto';
import type { TransactionDto } from '../../../bindings/TransactionDto';
import type { UpdatePortfolio } from '../../../bindings/UpdatePortfolio';
import type { UpsertTransaction } from '../../../bindings/UpsertTransaction';
import { del, get, post, put } from '../../../shared/api/client';
import type { RequestOptions } from '../../../shared/api/client';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

/**
 * Loads dashboard KPIs and the user's portfolios.
 *
 * @param portfolioId Active portfolio (`0` = default).
 * @param refresh Bypass the quotes cache.
 * @param options Abort signal from React Query.
 */
export async function fetchDashboard(
    portfolioId = 0,
    refresh = false,
    options?: RequestOptions,
): Promise<DashboardResponse> {
    const query = new URLSearchParams();
    if (portfolioId > 0) query.set('portfolio', String(portfolioId));
    if (refresh) query.set('refresh', 'true');
    const suffix = query.toString();
    return get<DashboardResponse>(
        `/api/dashboard${suffix ? `?${suffix}` : ''}`,
        options,
    );
}

export function dashboardQueryOptions(portfolioId = 0, refresh = false) {
    return queryOptions({
        queryKey: [...DASHBOARD_QUERY_KEY, portfolioId, refresh] as const,
        queryFn: ({ signal }) =>
            fetchDashboard(portfolioId, refresh, { signal }),
        staleTime: 30_000,
    });
}

export function createPortfolio(body: CreatePortfolio): Promise<PortfolioDto> {
    return post<PortfolioDto>('/api/portfolios', body);
}

export function updatePortfolio(
    id: number,
    body: UpdatePortfolio,
): Promise<PortfolioDto> {
    return put<PortfolioDto>(`/api/portfolios/${id}`, body);
}

export function setDefaultPortfolio(id: number): Promise<PortfolioDto> {
    return post<PortfolioDto>(`/api/portfolios/${id}/default`);
}

export function deletePortfolio(id: number): Promise<void> {
    return del(`/api/portfolios/${id}`);
}

export function createPosition(
    portfolioId: number,
    body: CreatePosition,
): Promise<PositionDto> {
    return post<PositionDto>(`/api/portfolios/${portfolioId}/positions`, body);
}

export function deletePosition(id: number): Promise<void> {
    return del(`/api/positions/${id}`);
}

export function createTransaction(
    positionId: number,
    body: UpsertTransaction,
): Promise<TransactionDto> {
    return post<TransactionDto>(
        `/api/positions/${positionId}/transactions`,
        body,
    );
}

export function updateTransaction(
    id: number,
    body: UpsertTransaction,
): Promise<TransactionDto> {
    return put<TransactionDto>(`/api/transactions/${id}`, body);
}

export function deleteTransaction(id: number): Promise<void> {
    return del(`/api/transactions/${id}`);
}
