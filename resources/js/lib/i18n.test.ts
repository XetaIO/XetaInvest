import { describe, expect, it } from 'vitest';
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
    it('exposes the same keys in English and French', () => {
        expect(flattenKeys(en).sort()).toEqual(flattenKeys(fr).sort());
    });
});
