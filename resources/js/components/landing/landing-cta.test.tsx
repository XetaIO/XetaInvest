import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { LandingCta } from '@/components/landing/landing-cta';
import i18n from '@/lib/i18n';

function renderCta(registrationEnabled: boolean) {
    return render(
        <I18nextProvider i18n={i18n}>
            <LandingCta registrationEnabled={registrationEnabled} />
        </I18nextProvider>,
    );
}

describe('LandingCta', () => {
    it('links to registration when public registration is enabled', () => {
        renderCta(true);

        expect(
            screen.getByRole('link', { name: /créer un compte/i }),
        ).toHaveAttribute('href', '/register');
    });

    it('links to the project repository when public registration is disabled', () => {
        renderCta(false);

        expect(
            screen.getByRole('link', { name: /installer le projet/i }),
        ).toHaveAttribute('href', 'https://github.com/XetaIO/XetaInvest');
        expect(
            screen.getByRole('link', { name: /installer le projet/i }),
        ).toHaveAttribute('target', '_blank');
    });
});
