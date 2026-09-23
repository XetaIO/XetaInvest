import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import i18n from '../../../i18n';
import { LandingCta } from './landing-cta';

describe('LandingCta', () => {
    it.each(['en', 'fr'])(
        'links to the GitHub project in %s',
        async (locale) => {
            await i18n.changeLanguage(locale);
            render(
                <MemoryRouter>
                    <LandingCta />
                </MemoryRouter>,
            );
            const link = screen.getByRole('link', {
                name: i18n.t('landing.cta.install_project'),
            });
            expect(link.getAttribute('href')).toBe(
                'https://github.com/XetaIO/XetaInvest',
            );
            expect(link.getAttribute('target')).toBe('_blank');
        },
    );
});
