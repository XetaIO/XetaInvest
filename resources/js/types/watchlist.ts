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
    section_id: string;
    position: number;
    instrument: WatchlistInstrument;
};

export type WatchlistSection = {
    id: string;
    name: string;
    position: number;
    is_default: boolean;
    items: WatchlistItem[];
};

export type Watchlist = {
    id: string;
    name: string;
    position: number;
    sections: WatchlistSection[];
};

export type WatchlistSummary = {
    id: string;
    name: string;
    default_section_id: string;
};

export type WatchlistLimits = {
    maxPerUser: number;
    maxItems: number;
};

export type WatchlistPosition = {
    avg_price: number;
    quantity: number;
    currency: string | null;
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

export type WatchlistLayoutSection = {
    id: string;
    item_ids: string[];
};
