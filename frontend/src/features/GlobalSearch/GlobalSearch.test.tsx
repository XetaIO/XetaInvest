import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ApiClientError } from '../../shared/api/client';
import { AuthHeader } from '../../shared/components/header/AuthHeader';
import { SidebarProvider } from '../../shared/components/hooks/SidebarProvider';
import { ThemeProvider } from '../../shared/providers/ThemeProvider';
import { AUTH_QUERY_KEY } from '../Auth/api/session';
import { AuthProvider } from '../Auth/providers/AuthProvider';
import { searchSymbols, symbolSearchOptions } from './api/symbolSearch';
import type { SymbolSearchResult } from './types';
import { getAvailableSymbolTypes } from './utils/symbolFilters';
import { GlobalSearch } from './views/GlobalSearch';

const symbols: SymbolSearchResult[] = [
    {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NMS',
        type: 'EQUITY',
        logo_url: null,
    },
    {
        symbol: 'SPY',
        name: 'SPDR S&P 500',
        exchange: 'PCX',
        type: 'ETF',
        logo_url: null,
    },
    {
        symbol: '^GSPC',
        name: 'S&P 500',
        exchange: 'SNP',
        type: 'INDEX',
        logo_url: 'https://example.com/logo.png',
    },
];

beforeEach(async () => {
    await i18n.changeLanguage('en');
});

function Harness() {
    const [isOpen, setOpen] = useState(false);
    const location = useLocation();
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Open search
            </button>
            <output aria-label="Location">{location.pathname}</output>
            <GlobalSearch isOpen={isOpen} onClose={() => setOpen(false)} />
        </>
    );
}

function renderSearch() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <Harness />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { user: userEvent.setup(), queryClient };
}

describe('symbol search API', () => {
    it('encodes the Rust API contract and forwards cancellation and cookie credentials', async () => {
        const fetchMock = vi.fn(async () => Response.json({ data: symbols }));
        vi.stubGlobal('fetch', fetchMock);
        const controller = new AbortController();
        expect(
            await searchSymbols(
                { q: '  S&P  ', limit: 100, region: 'FR' },
                { signal: controller.signal },
            ),
        ).toEqual(symbols);
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/symbol-search?q=S%26P&limit=50&region=FR',
            expect.objectContaining({
                method: 'GET',
                credentials: 'same-origin',
                signal: controller.signal,
            }),
        );
    });

    it('skips short queries and derives only financial filters from results', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        expect(await searchSymbols({ q: ' A ' })).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(getAvailableSymbolTypes(symbols)).toEqual([
            'equity',
            'etf',
            'index',
        ]);
    });

    it('propagates HTTP errors to the query layer', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json(
                    { code: 'unauthorized', message: 'Expired', details: null },
                    { status: 401 },
                ),
            ),
        );
        await expect(searchSymbols({ q: 'AA' })).rejects.toBeInstanceOf(
            ApiClientError,
        );
    });

    it('shares cached results for equivalent normalized parameters', async () => {
        const fetchMock = vi.fn(async () => Response.json({ data: symbols }));
        vi.stubGlobal('fetch', fetchMock);
        const queryClient = new QueryClient();
        try {
            await queryClient.prefetchQuery(
                symbolSearchOptions({ q: '  Apple  ' }),
            );
            const results = await queryClient.fetchQuery(
                symbolSearchOptions({ q: 'Apple', region: 'FR', limit: 25 }),
            );
            expect(results).toEqual(symbols);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/symbol-search?q=Apple&limit=25&region=FR',
                expect.anything(),
            );
        } finally {
            queryClient.clear();
        }
    });

    it('keeps different regions and limits in separate cache entries', async () => {
        const fetchMock = vi.fn(async (path: string) => {
            const params = new URL(path, 'http://localhost').searchParams;
            const index =
                params.get('region') === 'US'
                    ? 1
                    : params.get('limit') === '10'
                      ? 2
                      : 0;
            return Response.json({ data: [symbols[index]] });
        });
        vi.stubGlobal('fetch', fetchMock);
        const queryClient = new QueryClient();
        try {
            expect(
                await queryClient.fetchQuery(symbolSearchOptions({ q: 'sp' })),
            ).toEqual([symbols[0]]);
            expect(
                await queryClient.fetchQuery(
                    symbolSearchOptions({ q: 'sp', region: 'US' }),
                ),
            ).toEqual([symbols[1]]);
            expect(
                await queryClient.fetchQuery(
                    symbolSearchOptions({ q: 'sp', limit: 10 }),
                ),
            ).toEqual([symbols[2]]);
            expect(fetchMock).toHaveBeenCalledTimes(3);
        } finally {
            queryClient.clear();
        }
    });
});

describe('symbol search dialog', () => {
    it('debounces searches, filters instruments and selects the filtered result with Enter', async () => {
        const fetchMock = vi.fn(async () => Response.json({ data: symbols }));
        vi.stubGlobal('fetch', fetchMock);
        const { user } = renderSearch();
        expect(fetchMock).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Open search' }));
        const input = screen.getByRole('combobox');
        expect(document.activeElement).toBe(input);
        await user.type(input, 'A');
        expect(fetchMock).not.toHaveBeenCalled();
        await user.type(input, 'pple');
        await screen.findByRole('option', { name: /Apple Inc/ });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await user.click(screen.getByRole('button', { name: 'ETFs (1)' }));
        expect(screen.getAllByRole('option')).toHaveLength(1);
        await user.click(input);
        await user.keyboard('{Enter}');
        expect(screen.getByLabelText('Location').textContent).toBe(
            '/symbol/SPY',
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('uses the active keyboard selection and encodes the ticker', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json({ data: symbols })),
        );
        const { user } = renderSearch();
        await user.click(screen.getByRole('button', { name: 'Open search' }));
        await user.type(screen.getByRole('combobox'), 'sp');
        await screen.findByRole('option', { name: /Apple Inc/ });
        await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
        expect(screen.getByLabelText('Location').textContent).toBe(
            '/symbol/%5EGSPC',
        );
    });

    it('cancels obsolete requests and prevents late responses from replacing current results', async () => {
        let resolveOld!: (response: Response) => void;
        let oldSignal: AbortSignal | undefined;
        vi.stubGlobal(
            'fetch',
            vi.fn((path: string, options?: RequestInit) => {
                if (
                    new URL(path, 'http://localhost').searchParams.get('q') ===
                    'apple'
                ) {
                    oldSignal = options?.signal ?? undefined;
                    return new Promise<Response>((resolve) => {
                        resolveOld = resolve;
                    });
                }
                return Promise.resolve(Response.json({ data: [symbols[1]] }));
            }),
        );
        const { user } = renderSearch();
        await user.click(screen.getByRole('button', { name: 'Open search' }));
        const input = screen.getByRole('combobox');
        fireEvent.change(input, { target: { value: 'apple' } });
        await waitFor(() => expect(oldSignal).toBeDefined());
        fireEvent.change(input, { target: { value: 'spy' } });
        await waitFor(() => expect(oldSignal?.aborted).toBe(true));
        await screen.findByRole('option', { name: /SPDR/ });
        await act(async () => {
            resolveOld(Response.json({ data: [symbols[0]] }));
        });
        expect(screen.queryByRole('option', { name: /Apple Inc/ })).toBeNull();
        expect(screen.getByRole('option', { name: /SPDR/ })).toBeTruthy();
    });

    it('shows provider failure separately from empty results and can retry', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(
                    Response.json(
                        {
                            code: 'unavailable',
                            message: 'Unavailable',
                            details: null,
                        },
                        { status: 503 },
                    ),
                )
                .mockResolvedValueOnce(Response.json({ data: [] })),
        );
        const { user } = renderSearch();
        await user.click(screen.getByRole('button', { name: 'Open search' }));
        await user.type(screen.getByRole('combobox'), 'unknown');
        await screen.findByRole('alert');
        expect(screen.queryByText(/No symbols found/)).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        await screen.findByText(/No symbols found/);
    });

    it('cancels on close, restores focus and scroll, and starts with an empty input when reopened', async () => {
        let signal: AbortSignal | undefined;
        vi.stubGlobal(
            'fetch',
            vi.fn((_path: string, options: RequestInit) => {
                signal = options.signal ?? undefined;
                return new Promise<Response>(() => {});
            }),
        );
        document.body.style.overflow = 'auto';
        const { user } = renderSearch();
        const opener = screen.getByRole('button', { name: 'Open search' });
        await user.click(opener);
        await user.type(screen.getByRole('combobox'), 'apple');
        await waitFor(() => expect(signal).toBeDefined());
        await user.keyboard('{Escape}');
        expect(signal?.aborted).toBe(true);
        expect(document.activeElement).toBe(opener);
        expect(document.body.style.overflow).toBe('auto');
        await user.click(opener);
        expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe(
            '',
        );
        await user.tab();
        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Close' }),
        );
        await user.tab();
        expect(document.activeElement).toBe(screen.getByRole('combobox'));
        document.body.style.overflow = '';
    });

    it('opens from the existing header using Ctrl+K', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <ThemeProvider>
                        <AuthProvider>
                            <SidebarProvider>
                                <AuthHeader />
                            </SidebarProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        const user = userEvent.setup();
        await user.keyboard('{Control>}k{/Control}');
        expect(
            screen.getByRole('dialog', { name: 'Search symbols' }),
        ).toBeTruthy();
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).toBeNull();
        await user.click(
            screen.getAllByRole('button', { name: /Search symbols:/ })[0],
        );
        expect(
            screen.getByRole('dialog', { name: 'Search symbols' }),
        ).toBeTruthy();
    });
});
