import { describe, expect, it } from 'vitest';
import {
    assetTypeKey,
    historyDomain,
    OTHER_SLICE_KEY,
    parseScopeParam,
    toPieSlices,
} from './statistics';

describe('parseScopeParam', () => {
    it.each([null, '', 'all', 'abc', '-1', '0', '1.5'])(
        'falls back to all for %s',
        (raw) => {
            expect(parseScopeParam(raw)).toBe('all');
        },
    );

    it('reads a portfolio id', () => {
        expect(parseScopeParam('42')).toBe(42);
    });
});

describe('toPieSlices', () => {
    const item = (key: string, value: number) => ({ key, label: key, value });

    it('keeps up to five slices sorted by value', () => {
        const slices = toPieSlices(
            [item('a', 1), item('b', 3), item('c', 2)],
            'Other',
        );
        expect(slices.map((slice) => slice.key)).toEqual(['b', 'c', 'a']);
        expect(slices[0].color).toBe('var(--chart-1)');
    });

    it('merges the tail into an other slice beyond five', () => {
        const slices = toPieSlices(
            [1, 2, 3, 4, 5, 6].map((value) => item(`s${value}`, value)),
            'Other',
        );
        expect(slices).toHaveLength(5);
        expect(slices.map((slice) => slice.key)).toEqual([
            's6',
            's5',
            's4',
            's3',
            OTHER_SLICE_KEY,
        ]);
        expect(slices[4]).toMatchObject({ label: 'Other', value: 3 });
    });

    it('drops empty values', () => {
        expect(toPieSlices([item('a', 0)], 'Other')).toEqual([]);
    });
});

describe('historyDomain', () => {
    it('pads the range by 5%', () => {
        expect(
            historyDomain([
                {
                    date: '2026-01-01',
                    value_eur: 100,
                    invested_eur: 50,
                    pnl_eur: 50,
                },
                {
                    date: '2026-01-02',
                    value_eur: 150,
                    invested_eur: 50,
                    pnl_eur: 100,
                },
            ]),
        ).toEqual([45, 155]);
    });

    it('does not pad a flat series', () => {
        expect(
            historyDomain([
                {
                    date: '2026-01-01',
                    value_eur: 10,
                    invested_eur: 10,
                    pnl_eur: 0,
                },
            ]),
        ).toEqual([10, 10]);
    });
});

describe('assetTypeKey', () => {
    it('maps known types case-insensitively', () => {
        expect(assetTypeKey('ETF')).toBe('statistics.types.etf');
    });

    it('returns null for unknown types', () => {
        expect(assetTypeKey('warrant')).toBeNull();
    });
});
