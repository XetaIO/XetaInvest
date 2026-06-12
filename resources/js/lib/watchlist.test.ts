import { describe, expect, it } from 'vitest';
import {
    calculateSessionChange,
    mergePriceUpdate,
    moveWatchlistLayout,
    normalizeChartPoints,
} from '@/lib/watchlist';
import type { WatchlistSection } from '@/types/watchlist';

describe('watchlist market calculations', () => {
    it('calculates price and percentage changes from the session open', () => {
        expect(
            calculateSessionChange({
                id: 'AAPL',
                price: 110,
                open_price: 100,
                change: 99,
                change_percent: 99,
            }),
        ).toEqual({
            change: 10,
            changePercent: 10,
        });
    });

    it('returns no session change without a valid opening price', () => {
        expect(
            calculateSessionChange({
                id: 'AAPL',
                price: 110,
                change: 10,
                change_percent: 10,
            }),
        ).toBeNull();
    });

    it('preserves the HTTP opening price when a live tick sends zero', () => {
        expect(
            mergePriceUpdate(
                {
                    id: 'AAPL',
                    price: 100,
                    open_price: 95,
                    previous_close: 94,
                    change: 5,
                    change_percent: 5.26,
                },
                {
                    id: 'AAPL',
                    price: 101,
                    open_price: 0,
                    previous_close: 0,
                    change: 6,
                    change_percent: 6.32,
                },
            ),
        ).toMatchObject({
            price: 101,
            open_price: 95,
            previous_close: 94,
        });
    });

    it('normalizes chart values from the first close', () => {
        expect(
            normalizeChartPoints([
                point('2026-01-01', 200),
                point('2026-01-02', 220),
                point('2026-01-03', 180),
            ]),
        ).toEqual([
            { time: '2026-01-01', value: 0 },
            { time: '2026-01-02', value: 10 },
            { time: '2026-01-03', value: -10 },
        ]);
    });
});

describe('watchlist layout movement', () => {
    it('reorders sections and normalizes their positions', () => {
        const sections = fixture();
        const result = moveWatchlistLayout(sections, 'section-a', 'section-b');

        expect(result.map((section) => section.id)).toEqual([
            'section-b',
            'section-a',
        ]);
        expect(result.map((section) => section.position)).toEqual([0, 1]);
    });

    it('moves an item between sections and compacts positions', () => {
        const result = moveWatchlistLayout(fixture(), 'item-a', 'section-b');

        expect(result[0].items).toHaveLength(0);
        expect(result[1].items.map((item) => item.id)).toEqual([
            'item-b',
            'item-a',
        ]);
        expect(result[1].items[1]).toMatchObject({
            section_id: 'section-b',
            position: 1,
        });
    });
});

function point(date: string, close: number) {
    return {
        date,
        close,
        open: close,
        high: close,
        low: close,
        volume: null,
    };
}

function fixture(): WatchlistSection[] {
    return [
        {
            id: 'section-a',
            name: 'A',
            position: 0,
            is_default: true,
            items: [
                {
                    id: 'item-a',
                    section_id: 'section-a',
                    position: 0,
                    instrument: {
                        id: 1,
                        symbol: 'AAA',
                        name: null,
                        exchange: null,
                        type: null,
                        currency: null,
                    },
                },
            ],
        },
        {
            id: 'section-b',
            name: 'B',
            position: 1,
            is_default: false,
            items: [
                {
                    id: 'item-b',
                    section_id: 'section-b',
                    position: 0,
                    instrument: {
                        id: 2,
                        symbol: 'BBB',
                        name: null,
                        exchange: null,
                        type: null,
                        currency: null,
                    },
                },
            ],
        },
    ];
}
