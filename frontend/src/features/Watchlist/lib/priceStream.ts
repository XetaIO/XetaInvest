import type { PriceTickDto } from '../../../bindings/PriceTickDto';
import type { QuoteDto } from '../../../bindings/QuoteDto';

type RawTick = {
    id?: unknown;
    price?: unknown;
    change?: unknown;
    changePercent?: unknown;
    change_percent?: unknown;
    dayHigh?: unknown;
    day_high?: unknown;
    dayLow?: unknown;
    day_low?: unknown;
    dayVolume?: unknown;
    day_volume?: unknown;
    openPrice?: unknown;
    open_price?: unknown;
    previousClose?: unknown;
    previous_close?: unknown;
    shortName?: unknown;
    short_name?: unknown;
    currency?: unknown;
    exchange?: unknown;
    quoteType?: unknown;
    quote_type?: unknown;
    marketHours?: unknown;
    market_hours?: unknown;
    time?: unknown;
};

function num(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
}

function str(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

/**
 * Same-origin WebSocket URL for `GET /api/stream` (cookie JWT).
 */
export function streamUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/stream`;
}

/**
 * Parses one crate/Laravel tick (camelCase or snake_case). Heartbeats are dropped.
 */
export function normalizePriceTick(raw: unknown): PriceTickDto | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const tick = raw as RawTick;
    const id = str(tick.id)?.trim().toUpperCase();
    if (!id) {
        return null;
    }
    const quoteType = str(tick.quoteType) ?? str(tick.quote_type) ?? null;
    if (quoteType === 'HEARTBEAT') {
        return null;
    }
    return {
        id,
        price: num(tick.price) ?? 0,
        change: num(tick.change) ?? 0,
        changePercent: num(tick.changePercent) ?? num(tick.change_percent) ?? 0,
        dayHigh: num(tick.dayHigh) ?? num(tick.day_high) ?? null,
        dayLow: num(tick.dayLow) ?? num(tick.day_low) ?? null,
        dayVolume: num(tick.dayVolume) ?? num(tick.day_volume) ?? null,
        openPrice: num(tick.openPrice) ?? num(tick.open_price) ?? null,
        previousClose:
            num(tick.previousClose) ?? num(tick.previous_close) ?? null,
        shortName: str(tick.shortName) ?? str(tick.short_name) ?? null,
        currency: str(tick.currency) ?? null,
        exchange: str(tick.exchange) ?? null,
        quoteType,
        marketHours: str(tick.marketHours) ?? str(tick.market_hours) ?? null,
        time: num(tick.time) ?? null,
    };
}

/**
 * Overlays a live tick onto the HTTP quote used by the panel and chart.
 *
 * Partial ticks keep the previous open / previous-close / name when Yahoo
 * omits zeros (same as Laravel `mergePriceUpdate`).
 */
export function mergeTickIntoQuote(
    previous: QuoteDto | undefined,
    tick: PriceTickDto,
): QuoteDto {
    const previousClose =
        tick.previousClose !== null && tick.previousClose > 0
            ? tick.previousClose
            : (previous?.regular_market_previous_close ?? null);
    return {
        symbol: tick.id.toUpperCase(),
        name: tick.shortName ?? previous?.name ?? null,
        exchange: tick.exchange ?? previous?.exchange ?? null,
        quote_type:
            previous?.quote_type ?? tick.quoteType?.toLowerCase() ?? null,
        currency: tick.currency ?? previous?.currency ?? null,
        regular_market_price: tick.price,
        regular_market_change: tick.change,
        regular_market_change_percent: tick.changePercent,
        regular_market_previous_close: previousClose,
        logo_url: previous?.logo_url ?? null,
    };
}
