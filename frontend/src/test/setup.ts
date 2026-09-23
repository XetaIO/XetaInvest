import { cleanup, configure } from '@testing-library/react';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, vi } from 'vitest';
import i18n from '../i18n';

configure({ asyncUtilTimeout: 5000 });

beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
    document.documentElement.classList.remove('dark');
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
});

afterEach(() => {
    cleanup();
    toast.dismiss();
    vi.unstubAllGlobals();
});
