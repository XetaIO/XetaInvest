import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

beforeEach(async () => {
    await i18n.changeLanguage('en');
});

describe('LanguageSwitcher', () => {
    it('changes the language locally and restores the saved preference', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const user = userEvent.setup();
        render(<LanguageSwitcher />);
        await user.click(
            screen.getByRole('button', { name: 'Change language' }),
        );
        await user.click(screen.getByRole('option', { name: 'Français' }));
        await screen.findByRole('button', { name: 'Changer de langue' });
        expect(i18n.resolvedLanguage).toBe('fr');
        expect(localStorage.getItem('i18nextLng')).toBe('fr');
        expect(document.documentElement.lang).toBe('fr');
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.queryByRole('listbox')).toBeNull();

        // The detector also uses the stored preference when detecting language again.
        localStorage.setItem('i18nextLng', 'en');
        await act(async () => {
            await i18n.changeLanguage();
        });
        expect(i18n.resolvedLanguage).toBe('en');
        expect(document.documentElement.lang).toBe('en');
    });

    it('recognizes regional English and keeps the compact upward menu', async () => {
        await i18n.changeLanguage('en-US');
        const user = userEvent.setup();
        render(<LanguageSwitcher compact dropdownDirection="up" />);
        const trigger = screen.getByRole('button', { name: 'Change language' });
        expect(trigger.title).toBe('English');
        expect(trigger.textContent).toBe('');
        await user.click(trigger);
        expect(
            screen.getByRole('listbox').classList.contains('bottom-full'),
        ).toBe(true);
        expect(
            screen
                .getByRole('option', { name: 'English' })
                .getAttribute('aria-selected'),
        ).toBe('true');
        await user.click(screen.getByRole('option', { name: 'English' }));
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(trigger);
    });

    it('supports keyboard selection and closes on Escape, outside click and Tab', async () => {
        const user = userEvent.setup();
        render(
            <>
                <LanguageSwitcher />
                <button type="button">Outside</button>
            </>,
        );
        const trigger = screen.getByRole('button', { name: 'Change language' });
        await user.tab();
        await user.keyboard('{ArrowDown}');
        expect(document.activeElement).toBe(
            screen.getByRole('option', { name: 'English' }),
        );
        await user.keyboard('{ArrowUp}');
        expect(document.activeElement).toBe(
            screen.getByRole('option', { name: 'Français' }),
        );
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        await user.click(trigger);
        await user.click(screen.getByRole('button', { name: 'Outside' }));
        expect(screen.queryByRole('listbox')).toBeNull();
        await user.click(trigger);
        await user.tab();
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Outside' }),
        );
        await user.click(trigger);
        await user.keyboard('{Home}{Enter}');
        await screen.findByRole('button', { name: 'Changer de langue' });
    });

    it('reports a failed language change and enables retry', async () => {
        const user = userEvent.setup();
        const notify = vi
            .spyOn(toast, 'error')
            .mockReturnValue('language-error');
        vi.spyOn(i18n, 'changeLanguage').mockRejectedValueOnce(
            new Error('Language failed'),
        );
        render(<LanguageSwitcher />);
        await user.click(
            screen.getByRole('button', { name: 'Change language' }),
        );
        await user.click(screen.getByRole('option', { name: 'Français' }));
        await waitFor(() =>
            expect(notify).toHaveBeenCalledWith(
                'Unable to change language. Please try again.',
            ),
        );
        expect(
            (
                screen.getByRole('button', {
                    name: 'Change language',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(false);
    });
});
