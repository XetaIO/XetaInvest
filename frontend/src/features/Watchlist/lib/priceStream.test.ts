import { describe, expect, it } from 'vitest';
import type { QuoteDto } from '../../../bindings/QuoteDto';
import { mergeTickIntoQuote, normalizePriceTick } from './priceStream';

describe('normalizePriceTick', () => {
    it('accepts camelCase ticks and uppercases the id', () => {
        expect(
            normalizePriceTick({
                id: 'aapl',
                price: 190.5,
                change: 1.25,
                changePercent: 0.66,
                quoteType: 'EQUITY',
                shortName: 'Apple',
            }),
        ).toMatchObject({
            id: 'AAPL',
            price: 190.5,
            changePercent: 0.66,
            quoteType: 'EQUITY',
            shortName: 'Apple',
        });
    });

    it('drops heartbeats and blank ids', () => {
        expect(
            normalizePriceTick({
                id: 'AAPL',
                price: 1,
                quoteType: 'HEARTBEAT',
            }),
        ).toBeNull();
        expect(normalizePriceTick({ id: '', price: 1 })).toBeNull();
        expect(normalizePriceTick(null)).toBeNull();
    });
});

describe('mergeTickIntoQuote', () => {
    it('keeps the HTTP quote name and logo when the tick is sparse', () => {
        const previous: QuoteDto = {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            exchange: 'NMS',
            quote_type: 'equity',
            currency: 'USD',
            regular_market_price: 180,
            regular_market_change: 1,
            regular_market_change_percent: 0.5,
            regular_market_previous_close: 179,
            logo_url: 'https://example.com/aapl.png',
        };
        expect(
            mergeTickIntoQuote(previous, {
                id: 'AAPL',
                price: 190,
                change: 11,
                changePercent: 6.1,
                dayHigh: null,
                dayLow: null,
                dayVolume: null,
                openPrice: null,
                previousClose: 0,
                shortName: null,
                currency: null,
                exchange: null,
                quoteType: null,
                marketHours: null,
                time: null,
            }),
        ).toEqual({
            ...previous,
            regular_market_price: 190,
            regular_market_change: 11,
            regular_market_change_percent: 6.1,
        });
    });
});
