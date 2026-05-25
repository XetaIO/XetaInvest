export type WatchlistInstrument = {
    id: number;
    symbol: string;
    name: string | null;
    exchange: string | null;
    type: string | null;
    currency: string | null;
};

export type WatchlistItem = {
    id: string;
    position: number;
    instrument: WatchlistInstrument;
};

export type Watchlist = {
    id: string;
    name: string;
    position: number;
    items: WatchlistItem[];
};

export type WatchlistSummary = {
    id: string;
    name: string;
};

export type WatchlistLimits = {
    maxPerUser: number;
    maxItems: number;
};

export type PriceUpdate = {
    id: string;
    price: number;
    change: number;
    change_percent: number;
    day_high?: number;
    day_low?: number;
    day_volume?: number;
    open_price?: number;
    previous_close?: number;
    short_name?: string;
    currency?: string;
    exchange?: string;
    quote_type?: string;
    market_hours?: string;
    time?: string;
};

export type ChartPoint = {
    t: number;
    [symbol: string]: number;
};
