import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { routes } from '../../../routes';
import { ThemeProvider } from '../../../shared/providers/ThemeProvider';
import { AUTH_QUERY_KEY } from '../../Auth/api/session';
import { AuthProvider } from '../../Auth/providers/AuthProvider';

beforeEach(async () => {
    await i18n.changeLanguage('en');
    HTMLElement.prototype.scrollIntoView = vi.fn();
});

function renderWelcome(authenticated = false, initialEntries = ['/']) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
        AUTH_QUERY_KEY,
        authenticated
            ? { pid: 'user-1', name: 'Alice', email: 'alice@example.com' }
            : null,
    );
    const router = createMemoryRouter(routes, { initialEntries });
    const result = render(
        <QueryClientProvider client={queryClient}>
            <HelmetProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <RouterProvider router={router} />
                    </AuthProvider>
                </ThemeProvider>
            </HelmetProvider>
        </QueryClientProvider>,
    );
    return { ...result, router, user: userEvent.setup() };
}

describe('Welcome', () => {
    it('renders the complete guest landing page without an application header', async () => {
        const { container } = renderWelcome();
        await screen.findByRole('heading', {
            level: 1,
            name: /Manage your entire wealth/,
        });
        expect(screen.getAllByRole('main')).toHaveLength(1);
        expect(container.querySelector('.site-header')).toBeNull();
        expect(container.textContent).not.toMatch(
            /\b(?:landing|nav|budget|calculator|statistics|auth)\.[a-z_]/,
        );
        expect(document.title).toBe(i18n.t('landing.meta.title'));
        expect(
            document
                .querySelector('meta[name="description"]')
                ?.getAttribute('content'),
        ).toBe(i18n.t('landing.meta.description'));
    });

    it('uses the shared language switcher and navigates to login with React Router', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const { user, router } = renderWelcome();
        await screen.findByRole('heading', { level: 1 });
        await user.click(
            screen.getByRole('button', { name: 'Change language' }),
        );
        await user.click(screen.getByRole('option', { name: 'Français' }));
        await screen.findByRole('heading', {
            level: 1,
            name: /Pilotez tout votre patrimoine/,
        });
        expect(localStorage.getItem('i18nextLng')).toBe('fr');
        expect(document.title).toBe(i18n.t('landing.meta.title'));
        expect(fetchMock).not.toHaveBeenCalled();
        await user.click(
            screen.getAllByRole('link', { name: i18n.t('auth.sign_in') })[0],
        );
        await screen.findByRole('heading', {
            name: i18n.t('auth.login_button'),
        });
        expect(router.state.location.pathname).toBe('/login');
    });

    it('opens mobile navigation and closes it when choosing a section', async () => {
        const { user, container, router } = renderWelcome();
        await screen.findByRole('heading', { level: 1 });
        const opener = screen.getByRole('button', { name: 'Open menu' });
        await user.click(opener);
        expect(opener.getAttribute('aria-expanded')).toBe('true');
        const mobileMenu = container.querySelector<HTMLElement>(
            '#landing-mobile-navigation',
        )!;
        const link = within(mobileMenu).getByRole('link', {
            name: 'AI Assistant',
        });
        expect(link.getAttribute('href')).toBe('/#ai');
        expect(container.querySelector('#ai')).not.toBeNull();
        await user.click(link);
        expect(
            container.querySelector('#landing-mobile-navigation'),
        ).toBeNull();
        expect(router.state.location.hash).toBe('#ai');
        await waitFor(() =>
            expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled(),
        );
    });

    it('scrolls to a landing section from the welcome page', async () => {
        const { user, router } = renderWelcome();
        await screen.findByRole('heading', { level: 1 });
        await user.click(screen.getAllByRole('link', { name: 'Features' })[0]);
        expect(router.state.location.pathname).toBe('/');
        expect(router.state.location.hash).toBe('#features');
        await waitFor(() =>
            expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled(),
        );
    });

    it('returns to welcome and scrolls to the section from another page', async () => {
        const { user, router } = renderWelcome(false, ['/login']);
        await screen.findByRole('heading', {
            name: i18n.t('auth.login_button'),
        });
        await user.click(screen.getAllByRole('link', { name: 'Features' })[0]);
        await screen.findByRole('heading', {
            level: 1,
            name: /Manage your entire wealth/,
        });
        expect(router.state.location.pathname).toBe('/');
        expect(router.state.location.hash).toBe('#features');
        await waitFor(() =>
            expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled(),
        );
    });

    it('redirects an authenticated visitor to the dashboard', async () => {
        const { router } = renderWelcome(true);
        await screen.findByRole('link', { name: 'Dashboard' });
        expect(router.state.location.pathname).toBe('/dashboard');
    });
});
