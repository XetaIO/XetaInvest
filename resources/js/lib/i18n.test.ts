import { describe, expect, it } from 'vitest';
import i18n from '@/lib/i18n';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(value).flatMap(([key, child]) => {
        const path = prefix ? `${prefix}.${key}` : key;

        if (child && typeof child === 'object' && !Array.isArray(child)) {
            return flattenKeys(child as Record<string, unknown>, path);
        }

        return path;
    });
}

describe('translation catalogs', () => {
    it('initializes the shared i18next instance', () => {
        expect(i18n.isInitialized).toBe(true);
        expect(i18n.changeLanguage).toBeTypeOf('function');
    });

    it('exposes the same keys in English and French', () => {
        expect(flattenKeys(en).sort()).toEqual(flattenKeys(fr).sort());
    });
});
