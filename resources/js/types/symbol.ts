export type SymbolRange =
    | '1d'
    | '5d'
    | '1mo'
    | '3mo'
    | '6mo'
    | '1y'
    | '2y'
    | '5y'
    | '10y'
    | 'ytd';

export type ChartPoint = {
    date: string;
    close: number;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
};

export type SymbolQuote = {
    // Identity
    symbol: string;
    name: string | null;
    short_name: string | null;
    exchange: string | null;
    exchange_name: string | null;
    currency: string | null;
    currency_symbol: string | null;
    type: string | null;
    market_state: string | null;

    // Profile
    sector: string | null;
    industry: string | null;
    country: string | null;
    city: string | null;
    website: string | null;
    long_business_summary: string | null;
    full_time_employees: number | null;

    // Price
    price: number | null;
    change: number | null;
    change_percent: number | null;
    previous_close: number | null;
    open: number | null;
    day_high: number | null;
    day_low: number | null;
    bid: number | null;
    ask: number | null;

    // 52w / averages / all-time
    fifty_two_week_high: number | null;
    fifty_two_week_low: number | null;
    fifty_two_week_change: number | null;
    fifty_day_average: number | null;
    two_hundred_day_average: number | null;
    all_time_high: number | null;
    all_time_low: number | null;

    // Volume
    volume: number | null;
    avg_volume: number | null;
    avg_volume_10d: number | null;

    // Valuation
    market_cap: number | null;
    enterprise_value: number | null;
    pe: number | null;
    forward_pe: number | null;
    price_to_book: number | null;
    price_to_sales: number | null;
    book_value: number | null;
    enterprise_to_revenue: number | null;
    enterprise_to_ebitda: number | null;

    // Profitability
    eps: number | null;
    forward_eps: number | null;
    ebitda: number | null;
    ebitda_margins: number | null;
    gross_margins: number | null;
    operating_margins: number | null;
    profit_margins: number | null;
    return_on_assets: number | null;
    return_on_equity: number | null;
    revenue: number | null;
    revenue_growth: number | null;
    revenue_per_share: number | null;
    gross_profits: number | null;

    // Financial health
    total_cash: number | null;
    total_cash_per_share: number | null;
    total_debt: number | null;
    debt_to_equity: number | null;
    current_ratio: number | null;
    quick_ratio: number | null;
    free_cashflow: number | null;
    operating_cashflow: number | null;

    // Shares
    shares_outstanding: number | null;
    float_shares: number | null;
    held_percent_insiders: number | null;
    held_percent_institutions: number | null;

    // Dividends
    dividend_rate: number | null;
    dividend_yield: number | null;
    payout_ratio: number | null;

    // Risk
    beta: number | null;

    // Analyst
    target_mean_price: number | null;
    target_high_price: number | null;
    target_low_price: number | null;
    target_median_price: number | null;
    number_of_analyst_opinions: number | null;
    recommendation_key: string | null;
};

export type SymbolNewsItem = {
    title: string;
    link: string;
    source: string;
    image: string | null;
    time: string;
};

export type SymbolRecommendation = {
    symbol: string;
    name: string | null;
    score: number | null;
};

export type SymbolSearchResult = {
    symbol: string;
    name: string | null;
    exchange: string | null;
    type: string | null;
    logo_url: string | null;
};

export type SymbolProps = {
    symbol: string;
    quote: SymbolQuote | null;
    quote_error: string | null;
    chart: {
        range: SymbolRange;
        points: ChartPoint[];
    };
    news: SymbolNewsItem[];
    recommendations: SymbolRecommendation[];
    available_ranges: SymbolRange[];
};
