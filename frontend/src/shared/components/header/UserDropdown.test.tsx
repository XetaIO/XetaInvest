import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '../../../app/queryClient';
import { AUTH_QUERY_KEY } from '../../../features/Auth/api/session';
import { AuthProvider } from '../../../features/Auth/providers/AuthProvider';
import i18n from '../../../i18n';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { ThemedToastContainer } from '../common/ThemedToastContainer';
import UserDropdown from './UserDropdown';

const currentUser = {
    pid: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
};

beforeEach(async () => {
    await i18n.changeLanguage('en');
});

function renderDropdown() {
    const queryClient = createAppQueryClient();
    queryClient.setQueryData(AUTH_QUERY_KEY, currentUser);
    queryClient.setQueryData(['portfolio'], { balance: 100 });
    const onSubmit = vi.fn((event) => event.preventDefault());
    // No route guard: the dropdown must perform its own redirect after logout.
    const router = createMemoryRouter(
        [
            {
                path: '/account',
                element: (
                    <form onSubmit={onSubmit}>
                        <UserDropdown />
                    </form>
                ),
            },
            { path: '/', element: <h1>Welcome</h1> },
        ],
        { initialEntries: ['/account'] },
    );
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <RouterProvider router={router} />
                    <ThemedToastContainer />
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { user: userEvent.setup(), router, queryClient, onSubmit };
}

describe('UserDropdown logout', () => {
    it.each([204, 401])(
        'redirects and clears private data when logout returns %i',
        async (status) => {
            const fetchMock = vi.fn(async () =>
                status === 204
                    ? new Response(null, { status })
                    : Response.json(
                          {
                              code: 'unauthorized',
                              message: 'Expired',
                              details: null,
                          },
                          { status },
                      ),
            );
            vi.stubGlobal('fetch', fetchMock);
            const { user, router, queryClient, onSubmit } = renderDropdown();
            await user.click(
                screen.getByRole('button', { name: 'Open user menu' }),
            );
            await user.click(screen.getByRole('button', { name: 'Log out' }));
            await screen.findByRole('heading', { name: 'Welcome' });
            await screen.findByText('You have been logged out.');
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'same-origin',
                }),
            );
            expect(router.state.historyAction).toBe('REPLACE');
            expect(router.state.location.pathname).toBe('/');
            expect(queryClient.getQueryData(AUTH_QUERY_KEY)).toBeNull();
            expect(queryClient.getQueryData(['portfolio'])).toBeUndefined();
            expect(onSubmit).not.toHaveBeenCalled();
        },
    );

    it('shows an error, preserves the session and allows retry when logout fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockRejectedValueOnce(new TypeError('Network unavailable'))
                .mockResolvedValueOnce(new Response(null, { status: 204 })),
        );
        const { user, router, queryClient } = renderDropdown();
        await user.click(
            screen.getByRole('button', { name: 'Open user menu' }),
        );
        await user.click(screen.getByRole('button', { name: 'Log out' }));
        await screen.findByText('Unable to log out. Please try again.');
        expect(router.state.location.pathname).toBe('/account');
        expect(queryClient.getQueryData(AUTH_QUERY_KEY)).toEqual(currentUser);
        expect(queryClient.getQueryData(['portfolio'])).toEqual({
            balance: 100,
        });
        expect(screen.queryByText('You have been logged out.')).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Log out' }));
        await screen.findByRole('heading', { name: 'Welcome' });
    });

    it('prevents duplicate requests and waits for logout before navigating', async () => {
        let resolveLogout!: (response: Response) => void;
        const fetchMock = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveLogout = resolve;
                }),
        );
        vi.stubGlobal('fetch', fetchMock);
        const { user, router } = renderDropdown();
        await user.click(
            screen.getByRole('button', { name: 'Open user menu' }),
        );
        await user.click(screen.getByRole('button', { name: 'Log out' }));
        const pendingButton = screen.getByRole('button', {
            name: 'Logging out…',
        });
        expect((pendingButton as HTMLButtonElement).disabled).toBe(true);
        await user.click(pendingButton);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(router.state.location.pathname).toBe('/account');
        await act(async () =>
            resolveLogout(new Response(null, { status: 204 })),
        );
        await screen.findByRole('heading', { name: 'Welcome' });
    });
});
