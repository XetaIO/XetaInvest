import { describe, expect, it } from 'vitest';
import type { WatchlistInstrumentDto } from '../../../bindings/WatchlistInstrumentDto';
import type { WatchlistSectionDto } from '../../../bindings/WatchlistSectionDto';
import {
    itemDragId,
    moveWatchlistLayout,
    sectionDragId,
} from './watchlistLayout';

describe('moveWatchlistLayout', () => {
    it('reorders sections and normalizes their positions', () => {
        const result = moveWatchlistLayout(
            fixture(),
            sectionDragId(1),
            sectionDragId(2),
        );

        expect(result.map((section) => section.id)).toEqual([2, 1]);
        expect(result.map((section) => section.position)).toEqual([0, 1]);
    });

    it('moves an item between sections and compacts positions', () => {
        const result = moveWatchlistLayout(
            fixture(),
            itemDragId(11),
            sectionDragId(2),
        );

        expect(result[0].items).toHaveLength(0);
        expect(result[1].items.map((item) => item.id)).toEqual([12, 11]);
        expect(result[1].items[1]).toMatchObject({
            section_id: 2,
            position: 1,
        });
    });

    it('reorders two symbols inside the same section', () => {
        const sections = fixture();
        sections[0].items.push({
            id: 13,
            section_id: 1,
            position: 1,
            instrument: instrument(3, 'MSFT'),
        });

        const result = moveWatchlistLayout(
            sections,
            itemDragId(13),
            itemDragId(11),
        );

        expect(result[0].items.map((item) => item.instrument.symbol)).toEqual([
            'MSFT',
            'AAPL',
        ]);
        expect(result[0].items.map((item) => item.position)).toEqual([0, 1]);
    });
});

function instrument(id: number, symbol: string): WatchlistInstrumentDto {
    return {
        id,
        symbol,
        name: symbol,
        exchange: null,
        quote_type: null,
        currency: 'USD',
        logo_url: null,
    };
}

function fixture(): WatchlistSectionDto[] {
    return [
        {
            id: 1,
            name: 'A',
            position: 0,
            is_default: true,
            items: [
                {
                    id: 11,
                    section_id: 1,
                    position: 0,
                    instrument: instrument(1, 'AAPL'),
                },
            ],
        },
        {
            id: 2,
            name: 'B',
            position: 1,
            is_default: false,
            items: [
                {
                    id: 12,
                    section_id: 2,
                    position: 0,
                    instrument: instrument(2, 'MSFT'),
                },
            ],
        },
    ];
}
