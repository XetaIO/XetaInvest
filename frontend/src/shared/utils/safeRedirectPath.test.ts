import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirectPath';

describe('safeRedirectPath', () => {
    it.each([
        undefined,
        null,
        123,
        'https://example.com',
        '//example.com',
        '/\\example.com',
        '/\n/example.com',
        '/login',
        '/login?next=/',
        '/foo/../login',
    ])('rejects unsafe or looping redirect %s', (candidate) => {
        expect(safeRedirectPath(candidate)).toBe('/dashboard');
    });

    it('preserves a local path, search and hash', () => {
        expect(safeRedirectPath('/dashboard?period=year#positions')).toBe(
            '/dashboard?period=year#positions',
        );
    });
});
