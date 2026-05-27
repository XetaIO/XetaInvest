import type { AiReport } from './ai';

export type PortfolioSummary = {
    id: number;
    name: string;
    is_default: boolean;
};

export type Instrument = {
    id: number;
    symbol: string;
    name: string | null;
    currency: string;
    exchange: string | null;
};

export type PositionLine = {
    transaction_id: number;
    executed_at: string;
    original_quantity: number;
    remaining_quantity: number;
    unit_price: number;
    invested_native: number;
    current_value_native: number;
    pnl_native: number;
    pnl_pct: number;
};

export type PositionKpis = {
    position_id: number;
    instrument: Instrument;
    quantity: number;
    avg_cost_native: number;
    invested_native: number;
    current_value_native: number;
    pnl_native: number;
    invested_eur: number;
    current_value_eur: number;
    pnl_eur: number;
    pnl_pct: number;
    daily_change_eur: number;
    daily_change_pct: number;
    currency: string;
    fx_rate: number;
    price: number;
    previous_close: number;
    realized_pnl_native: number;
    realized_pnl_eur: number;
    lines: PositionLine[];
};

export type PortfolioKpis = {
    total_invested_eur: number;
    current_value_eur: number;
    pnl_eur: number;
    pnl_pct: number;
    daily_change_eur: number;
    daily_change_pct: number;
    positions: PositionKpis[];
};

export type ActivePortfolio = {
    portfolio: PortfolioSummary;
    kpis: PortfolioKpis;
    last_updated: string;
    quote_error: string | null;
};

export type TransactionTypeOption = {
    value: 'buy' | 'sell';
    label: string;
};

export type SearchResult = {
    symbol: string;
    name: string | null;
    exchange?: string | null;
    type?: string | null;
};

export type DashboardProps = {
    portfolios: PortfolioSummary[];
    active: ActivePortfolio | null;
    transactionTypes: TransactionTypeOption[];
    aiReport?: AiReport | null;
    aiGlobalReport?: AiReport | null;
};

export type StatsScope =
    | { type: 'all' }
    | { type: 'portfolio'; id: number; name: string };

export type StatsTotals = {
    invested_eur: number;
    current_value_eur: number;
    pnl_eur: number;
    pnl_pct: number;
    daily_change_eur: number;
    daily_change_pct: number;
    position_count: number;
    instrument_count: number;
    portfolio_count: number;
};

export type InstrumentAllocation = {
    symbol: string;
    name: string | null;
    currency: string;
    type: string;
    value_eur: number;
    invested_eur: number;
    pnl_eur: number;
    pnl_pct: number;
    percent: number;
};

export type CurrencyAllocation = {
    currency: string;
    value_eur: number;
    percent: number;
};

export type TypeAllocation = {
    type: string;
    value_eur: number;
    percent: number;
};

export type PortfolioAllocation = {
    portfolio_id: number;
    name: string;
    value_eur: number;
    percent: number;
};

export type HistoryPoint = {
    date: string;
    value_eur: number;
    invested_eur: number;
    pnl_eur: number;
};

export type StatsPayload = {
    scope: StatsScope;
    totals: StatsTotals;
    allocations: {
        by_instrument: InstrumentAllocation[];
        by_currency: CurrencyAllocation[];
        by_type: TypeAllocation[];
        by_portfolio: PortfolioAllocation[];
    };
    performance: {
        top_gainers: InstrumentAllocation[];
        top_losers: InstrumentAllocation[];
    };
    generated_at: string;
    quote_error: string | null;
    history: HistoryPoint[];
};

export type StatisticsProps = {
    portfolios: PortfolioSummary[];
    scope: string;
    stats: StatsPayload;
};
