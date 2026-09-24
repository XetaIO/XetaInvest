import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneElement } from 'react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import type * as Recharts from 'recharts';
import { describe, expect, it, vi } from 'vitest';
import type { InstrumentAllocation } from '../../../bindings/InstrumentAllocation';
import type { StatisticsResponse } from '../../../bindings/StatisticsResponse';
import { StatisticsPage } from './StatisticsPage';

// jsdom has no layout: give Recharts a fixed size instead of measuring.
vi.mock('recharts', async (importOriginal) => {
    const actual = await importOriginal<typeof Recharts>();
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: ReactElement }) =>
            cloneElement(
                children as ReactElement<{ width: number; height: number }>,
                {
                    width: 800,
                    height: 300,
                },
            ),
    };
});

const aapl: InstrumentAllocation = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currency: 'USD',
    asset_type: 'equity',
    value_eur: 1840,
    invested_eur: 920,
    pnl_eur: 920,
    pnl_pct: 100,
    percent: 100,
};

function payload(
    overrides: Partial<StatisticsResponse> = {},
): StatisticsResponse {
    return {
        portfolios: [
            {
                id: 1,
                user_id: 1,
                name: 'Core',
                is_default: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            },
        ],
        scope: { type: 'all' },
        totals: {
            invested_eur: 920,
            current_value_eur: 1840,
            pnl_eur: 920,
            pnl_pct: 100,
            daily_change_eur: 9.2,
            daily_change_pct: 0.5,
            position_count: 1,
            instrument_count: 1,
            portfolio_count: 1,
        },
        allocations: {
            by_instrument: [aapl],
            by_currency: [{ currency: 'USD', value_eur: 1840, percent: 100 }],
            by_type: [{ asset_type: 'equity', value_eur: 1840, percent: 100 }],
            by_portfolio: [
                {
                    portfolio_id: 1,
                    name: 'Core',
                    value_eur: 1840,
                    percent: 100,
                },
            ],
        },
        performance: { top_gainers: [aapl], top_losers: [] },
        history: [
            {
                date: '2026-09-23',
                value_eur: 1800,
                invested_eur: 920,
                pnl_eur: 880,
            },
            {
                date: '2026-09-24',
                value_eur: 1840,
                invested_eur: 920,
                pnl_eur: 920,
            },
        ],
        generated_at: '2026-09-24T10:00:00Z',
        quote_error: null,
        ...overrides,
    };
}

function stubApi(body: StatisticsResponse) {
    const fetchMock = vi.fn(async () => Response.json(body));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function requestedPaths(fetchMock: ReturnType<typeof stubApi>): string[] {
    return fetchMock.mock.calls.map((call) => String((call as unknown[])[0]));
}

function renderPage(path = '/statistics') {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[path]}>
                <StatisticsPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return userEvent.setup();
}

describe('StatisticsPage', () => {
    it('loads every portfolio by default and renders the sections', async () => {
        const fetchMock = stubApi(payload());
        renderPage();

        expect(await screen.findByText('By instrument detail')).toBeTruthy();
        expect(requestedPaths(fetchMock)[0]).toBe(
            '/api/statistics?portfolio=all',
        );
        expect(screen.getByText('Current value')).toBeTruthy();
        expect(screen.getByText('1 instruments · 1 positions')).toBeTruthy();
        expect(screen.getByText('Value evolution')).toBeTruthy();
        expect(screen.getByText('Positions map')).toBeTruthy();
        expect(screen.getByText('Top gainers')).toBeTruthy();
        expect(screen.getByText('No positions in loss.')).toBeTruthy();
        expect(screen.getAllByText('Apple Inc.').length).toBeGreaterThan(0);
        // A single portfolio: no "by portfolio" donut.
        expect(screen.queryByText('By portfolio')).toBeNull();
    });

    it('shows the empty state without positions', async () => {
        stubApi(
            payload({
                totals: {
                    ...payload().totals,
                    position_count: 0,
                    instrument_count: 0,
                },
            }),
        );
        renderPage();

        expect(
            await screen.findByText('No positions to analyse for this scope.'),
        ).toBeTruthy();
        expect(screen.queryByText('Value evolution')).toBeNull();
    });

    it('surfaces a quote error banner', async () => {
        stubApi(
            payload({ quote_error: 'Market data is temporarily unavailable.' }),
        );
        renderPage();

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Quotes unavailable');
        expect(alert.textContent).toContain(
            'Market data is temporarily unavailable.',
        );
    });

    it('reloads the statistics of the selected portfolio', async () => {
        const fetchMock = stubApi(payload());
        const user = renderPage();

        const select = await screen.findByRole('combobox', {
            name: 'Select a portfolio',
        });
        await waitFor(() =>
            expect(select.querySelectorAll('option')).toHaveLength(2),
        );
        await user.selectOptions(select, '1');

        await waitFor(() =>
            expect(requestedPaths(fetchMock)).toContain(
                '/api/statistics?portfolio=1',
            ),
        );
    });

    it('refreshes with fresh quotes on demand', async () => {
        const fetchMock = stubApi(payload());
        const user = renderPage('/statistics?portfolio=1');

        await screen.findByText('By instrument detail');
        await user.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() =>
            expect(requestedPaths(fetchMock)).toContain(
                '/api/statistics?portfolio=1&refresh=true',
            ),
        );
    });
});
