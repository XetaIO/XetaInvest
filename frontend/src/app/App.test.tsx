import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { toast } from 'react-toastify';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_QUERY_KEY } from '../features/Auth/api/session';
import { AuthProvider } from '../features/Auth/providers/AuthProvider';
import { routes } from '../routes/index';
import { get } from '../shared/api/client';
import { ThemedToastContainer } from '../shared/components/common/ThemedToastContainer';
import { ThemeProvider } from '../shared/providers/ThemeProvider';
import { createAppQueryClient } from './queryClient';

const currentUser = {
    pid: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
};
const unauthorized = () =>
    Response.json(
        { code: 'unauthorized', message: 'Unauthorized', details: null },
        { status: 401 },
    );
const serverError = () =>
    Response.json(
        { code: 'internal', message: 'Unavailable', details: null },
        { status: 500 },
    );

function renderApp(path = '/dashboard', state?: unknown) {
    const queryClient = createAppQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false, gcTime: 0 } });
    const router = createMemoryRouter(routes, {
        initialEntries: [
            {
                pathname: path.split('?')[0],
                search: path.includes('?') ? '?' + path.split('?')[1] : '',
                state,
            },
        ],
    });
    render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <HelmetProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <RouterProvider router={router} />
                            <ThemedToastContainer />
                        </AuthProvider>
                    </ThemeProvider>
                </HelmetProvider>
            </QueryClientProvider>
        </StrictMode>,
    );
    return { queryClient, router, user: userEvent.setup() };
}

describe('authentication and routes', () => {
    it('keeps the dashboard hidden until the session is checked', async () => {
        let finish!: (response: Response) => void;
        vi.stubGlobal(
            'fetch',
            vi.fn(
                () =>
                    new Promise<Response>((resolve) => {
                        finish = resolve;
                    }),
            ),
        );
        const { router } = renderApp();
        expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
        expect(router.state.location.pathname).toBe('/dashboard');
        await act(async () => finish(unauthorized()));
        await screen.findByRole('heading', { name: 'Login' });
        expect(router.state.location.pathname).toBe('/login');
    });

    it('keeps public routes accessible while the session API is pending', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise<Response>(() => {})),
        );
        renderApp('/missing');
        await screen.findByRole('heading', { name: 'Page not found' });
    });

    it('logs in using cookies and restores the requested route and query string', async () => {
        let authenticated = false;
        const fetchMock = vi.fn(async (path: string) => {
            if (path === '/api/auth/login') {
                authenticated = true;
                return Response.json({
                    pid: 'user-1',
                    name: 'Alice',
                    is_verified: true,
                });
            }
            return authenticated ? Response.json(currentUser) : unauthorized();
        });
        vi.stubGlobal('fetch', fetchMock);
        const { user, router } = renderApp('/dashboard?period=year');
        await screen.findByRole('heading', { name: 'Login' });
        await user.type(
            screen.getByLabelText(/^email address/i),
            currentUser.email,
        );
        await user.type(screen.getByLabelText(/^password/i), 'test-password');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        await screen.findByRole('link', { name: 'Dashboard' });
        expect(router.state.location.search).toBe('?period=year');
        expect(screen.getByText('Alice')).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/auth/login',
            expect.objectContaining({
                method: 'POST',
                credentials: 'same-origin',
                body: JSON.stringify({
                    email: currentUser.email,
                    password: 'test-password',
                }),
            }),
        );
        await screen.findByText('You are now logged in.');
    });

    it('shows invalid credentials on the form without redirecting', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => unauthorized()),
        );
        const { user, router } = renderApp('/login');
        await user.type(
            await screen.findByLabelText(/^email address/i),
            currentUser.email,
        );
        await user.type(screen.getByLabelText(/^password/i), 'wrong-password');
        await user.click(screen.getByRole('button', { name: 'Login' }));
        await screen.findByText('Invalid email or password.');
        expect(router.state.location.pathname).toBe('/login');
        expect(
            (screen.getByRole('button', { name: 'Login' }) as HTMLButtonElement)
                .disabled,
        ).toBe(false);
    });

    it('creates an account and returns to login', async () => {
        const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
            if (path === '/api/auth/register' && init?.method === 'POST') {
                return Response.json(null);
            }
            return unauthorized();
        });
        vi.stubGlobal('fetch', fetchMock);
        const { user, router } = renderApp('/register');
        await screen.findByRole('heading', { name: 'Sign up' });
        await user.type(screen.getByLabelText(/^name/i), 'Alice');
        await user.type(
            screen.getByLabelText(/^email address/i),
            currentUser.email,
        );
        await user.type(
            screen.getByLabelText(/^password \*/i),
            'test-password',
        );
        await user.type(
            screen.getByLabelText(/^confirm password/i),
            'other-password',
        );
        await user.click(screen.getByRole('button', { name: 'Sign up' }));
        await screen.findByText('Passwords do not match.');
        expect(fetchMock).not.toHaveBeenCalledWith(
            '/api/auth/register',
            expect.anything(),
        );

        await user.clear(screen.getByLabelText(/^confirm password/i));
        await user.type(
            screen.getByLabelText(/^confirm password/i),
            'test-password',
        );
        await user.click(screen.getByRole('button', { name: 'Sign up' }));
        await screen.findByRole('heading', { name: 'Login' });
        expect(router.state.location.pathname).toBe('/login');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/auth/register',
            expect.objectContaining({
                method: 'POST',
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: 'Alice',
                    email: currentUser.email,
                    password: 'test-password',
                }),
            }),
        );
        await screen.findByText(
            'Account created. Check your email, then log in.',
        );
    });

    it('redirects an authenticated guest to the dashboard and rejects external destinations', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json(currentUser)),
        );
        const { router } = renderApp('/login', { from: '//example.com' });
        await screen.findByRole('link', { name: 'Dashboard' });
        expect(router.state.location.pathname).toBe('/dashboard');
    });

    it('treats a missing user after db reset as logged out on the landing page', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                Response.json(
                    {
                        error: 'not_found',
                        description: 'Resource was not found',
                    },
                    { status: 404 },
                ),
            ),
        );
        renderApp('/');
        await screen.findByRole('heading', {
            level: 1,
            name: /Manage your entire wealth/,
        });
        expect(
            screen.queryByText(
                'Unable to check your session. Please try again.',
            ),
        ).toBeNull();
    });

    it('shows a retryable API failure without treating it as a logged-out session', async () => {
        let available = false;
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                available ? Response.json(currentUser) : serverError(),
            ),
        );
        const { user, router } = renderApp();
        await screen.findByText(
            'Unable to check your session. Please try again.',
        );
        expect(router.state.location.pathname).toBe('/dashboard');
        available = true;
        await user.click(screen.getByRole('button', { name: 'Try again' }));
        await screen.findByRole('link', { name: 'Dashboard' });
    });

    it('clears the user and cached private data after successful logout', async () => {
        let sessionActive = true;
        vi.stubGlobal(
            'fetch',
            vi.fn(async (path: string) => {
                if (path === '/api/auth/logout') {
                    sessionActive = false;
                    return new Response(null, { status: 204 });
                }
                return sessionActive
                    ? Response.json(currentUser)
                    : unauthorized();
            }),
        );
        const { user, queryClient, router } = renderApp();
        await screen.findByRole('link', { name: 'Dashboard' });
        queryClient.setQueryData(['portfolio'], { balance: 123 });
        await user.click(
            screen.getByRole('button', { name: 'Open user menu' }),
        );
        await user.click(screen.getByRole('button', { name: 'Log out' }));
        await screen.findByRole('heading', {
            level: 1,
            name: /Manage your entire wealth/,
        });
        expect(router.state.location.pathname).toBe('/');
        expect(queryClient.getQueryData(AUTH_QUERY_KEY)).toBeNull();
        expect(queryClient.getQueryData(['portfolio'])).toBeUndefined();
    });

    it('keeps the session if the logout request fails', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (path: string) =>
                path === '/api/auth/logout'
                    ? serverError()
                    : Response.json(currentUser),
            ),
        );
        const { user, queryClient, router } = renderApp();
        await screen.findByRole('link', { name: 'Dashboard' });
        await user.click(
            screen.getByRole('button', { name: 'Open user menu' }),
        );
        await user.click(screen.getByRole('button', { name: 'Log out' }));
        await screen.findByText('Unable to log out. Please try again.');
        expect(router.state.location.pathname).toBe('/dashboard');
        expect(queryClient.getQueryData(AUTH_QUERY_KEY)).toEqual(currentUser);
    });

    it('expires the session when a protected query returns 401', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (path: string) =>
                path === '/api/portfolio'
                    ? unauthorized()
                    : Response.json(currentUser),
            ),
        );
        const { queryClient } = renderApp();
        await screen.findByRole('link', { name: 'Dashboard' });
        queryClient.setQueryData(['portfolio'], { balance: 123 });
        await act(async () => {
            await expect(
                queryClient.fetchQuery({
                    queryKey: ['protected'],
                    queryFn: () => get('/api/portfolio'),
                }),
            ).rejects.toThrow();
        });
        await screen.findByRole('heading', { name: 'Login' });
        expect(queryClient.getQueryData(['portfolio'])).toBeUndefined();
    });

    it('clears private data when refreshing the session reports expiration', async () => {
        let authenticated = true;
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                authenticated ? Response.json(currentUser) : unauthorized(),
            ),
        );
        const { queryClient } = renderApp();
        await screen.findByRole('link', { name: 'Dashboard' });
        queryClient.setQueryData(['portfolio'], { balance: 123 });
        authenticated = false;
        await act(async () => {
            await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        });
        await screen.findByRole('heading', { name: 'Login' });
        expect(queryClient.getQueryData(['portfolio'])).toBeUndefined();
    });

    it('renders unknown routes as a public 404 page', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => unauthorized()),
        );
        renderApp('/missing');
        await screen.findByRole('heading', { name: 'Page not found' });
    });
});

describe('theme and notifications', () => {
    it('restores the saved theme and applies a changed theme to the page and new toasts', async () => {
        localStorage.setItem('xeta-invest-theme', 'dark');
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json(currentUser)),
        );
        const { user } = renderApp('/missing');
        await screen.findByRole('heading', { name: 'Page not found' });
        await screen.findByRole('button', { name: 'Toggle theme' });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        act(() => {
            toast.error('Dark theme notification');
        });
        await screen.findByText('Dark theme notification');
        expect(
            document.querySelector('.Toastify__toast-theme--dark'),
        ).not.toBeNull();
        await user.click(screen.getByRole('button', { name: 'Toggle theme' }));
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('xeta-invest-theme')).toBe('light');
        act(() => {
            toast.error('Light theme notification');
        });
        await waitFor(() =>
            expect(
                document.querySelector('.Toastify__toast-theme--light'),
            ).not.toBeNull(),
        );
    });

    it('follows system theme changes until an explicit preference is selected', async () => {
        let onChange: (() => void) | undefined;
        const media = {
            matches: false,
            addEventListener: vi.fn((_type: string, listener: () => void) => {
                onChange = listener;
            }),
            removeEventListener: vi.fn(),
        };
        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => media),
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => Response.json(currentUser)),
        );
        const { user } = renderApp('/missing');
        await screen.findByRole('heading', { name: 'Page not found' });
        const themeToggle = await screen.findByRole('button', {
            name: 'Toggle theme',
        });
        act(() => {
            media.matches = true;
            onChange?.();
        });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        await user.click(themeToggle);
        act(() => {
            media.matches = true;
            onChange?.();
        });
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
