use ts_rs::TS;

/// Chart window accepted by `GET /api/symbols/{symbol}` and `/chart`.
pub const DEFAULT_CHART_RANGE: &str = "1mo";

/// Ranges shown on the symbol chart.
pub const CHART_RANGES: [&str; 10] = [
    "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd",
];

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS, Default)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolQuoteDto {
    pub symbol: String,
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub exchange: Option<String>,
    pub exchange_name: Option<String>,
    pub currency: Option<String>,
    pub currency_symbol: Option<String>,
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    pub quote_type: Option<String>,
    pub market_state: Option<String>,
    pub sector: Option<String>,
    pub industry: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub website: Option<String>,
    pub long_business_summary: Option<String>,
    #[ts(type = "number | null")]
    pub full_time_employees: Option<f64>,
    pub logo_url: Option<String>,
    #[ts(type = "number | null")]
    pub price: Option<f64>,
    #[ts(type = "number | null")]
    pub change: Option<f64>,
    #[ts(type = "number | null")]
    pub change_percent: Option<f64>,
    #[ts(type = "number | null")]
    pub previous_close: Option<f64>,
    #[ts(type = "number | null")]
    pub open: Option<f64>,
    #[ts(type = "number | null")]
    pub day_high: Option<f64>,
    #[ts(type = "number | null")]
    pub day_low: Option<f64>,
    #[ts(type = "number | null")]
    pub bid: Option<f64>,
    #[ts(type = "number | null")]
    pub ask: Option<f64>,
    #[ts(type = "number | null")]
    pub fifty_two_week_high: Option<f64>,
    #[ts(type = "number | null")]
    pub fifty_two_week_low: Option<f64>,
    #[ts(type = "number | null")]
    pub fifty_two_week_change: Option<f64>,
    #[ts(type = "number | null")]
    pub fifty_day_average: Option<f64>,
    #[ts(type = "number | null")]
    pub two_hundred_day_average: Option<f64>,
    #[ts(type = "number | null")]
    pub all_time_high: Option<f64>,
    #[ts(type = "number | null")]
    pub all_time_low: Option<f64>,
    #[ts(type = "number | null")]
    pub volume: Option<f64>,
    #[ts(type = "number | null")]
    pub avg_volume: Option<f64>,
    #[ts(type = "number | null")]
    pub avg_volume_10d: Option<f64>,
    #[ts(type = "number | null")]
    pub market_cap: Option<f64>,
    #[ts(type = "number | null")]
    pub enterprise_value: Option<f64>,
    #[ts(type = "number | null")]
    pub pe: Option<f64>,
    #[ts(type = "number | null")]
    pub forward_pe: Option<f64>,
    #[ts(type = "number | null")]
    pub price_to_book: Option<f64>,
    #[ts(type = "number | null")]
    pub price_to_sales: Option<f64>,
    #[ts(type = "number | null")]
    pub book_value: Option<f64>,
    #[ts(type = "number | null")]
    pub enterprise_to_revenue: Option<f64>,
    #[ts(type = "number | null")]
    pub enterprise_to_ebitda: Option<f64>,
    #[ts(type = "number | null")]
    pub eps: Option<f64>,
    #[ts(type = "number | null")]
    pub forward_eps: Option<f64>,
    #[ts(type = "number | null")]
    pub ebitda: Option<f64>,
    #[ts(type = "number | null")]
    pub ebitda_margins: Option<f64>,
    #[ts(type = "number | null")]
    pub gross_margins: Option<f64>,
    #[ts(type = "number | null")]
    pub operating_margins: Option<f64>,
    #[ts(type = "number | null")]
    pub profit_margins: Option<f64>,
    #[ts(type = "number | null")]
    pub return_on_assets: Option<f64>,
    #[ts(type = "number | null")]
    pub return_on_equity: Option<f64>,
    #[ts(type = "number | null")]
    pub revenue: Option<f64>,
    #[ts(type = "number | null")]
    pub revenue_growth: Option<f64>,
    #[ts(type = "number | null")]
    pub revenue_per_share: Option<f64>,
    #[ts(type = "number | null")]
    pub gross_profits: Option<f64>,
    #[ts(type = "number | null")]
    pub total_cash: Option<f64>,
    #[ts(type = "number | null")]
    pub total_cash_per_share: Option<f64>,
    #[ts(type = "number | null")]
    pub total_debt: Option<f64>,
    #[ts(type = "number | null")]
    pub debt_to_equity: Option<f64>,
    #[ts(type = "number | null")]
    pub current_ratio: Option<f64>,
    #[ts(type = "number | null")]
    pub quick_ratio: Option<f64>,
    #[ts(type = "number | null")]
    pub free_cashflow: Option<f64>,
    #[ts(type = "number | null")]
    pub operating_cashflow: Option<f64>,
    #[ts(type = "number | null")]
    pub shares_outstanding: Option<f64>,
    #[ts(type = "number | null")]
    pub float_shares: Option<f64>,
    #[ts(type = "number | null")]
    pub held_percent_insiders: Option<f64>,
    #[ts(type = "number | null")]
    pub held_percent_institutions: Option<f64>,
    #[ts(type = "number | null")]
    pub dividend_rate: Option<f64>,
    #[ts(type = "number | null")]
    pub dividend_yield: Option<f64>,
    #[ts(type = "number | null")]
    pub payout_ratio: Option<f64>,
    #[ts(type = "number | null")]
    pub beta: Option<f64>,
    #[ts(type = "number | null")]
    pub target_mean_price: Option<f64>,
    #[ts(type = "number | null")]
    pub target_high_price: Option<f64>,
    #[ts(type = "number | null")]
    pub target_low_price: Option<f64>,
    #[ts(type = "number | null")]
    pub target_median_price: Option<f64>,
    #[ts(type = "number | null")]
    pub number_of_analyst_opinions: Option<f64>,
    pub recommendation_key: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct ChartPointDto {
    pub date: String,
    #[ts(type = "number")]
    pub close: f64,
    #[ts(type = "number | null")]
    pub open: Option<f64>,
    #[ts(type = "number | null")]
    pub high: Option<f64>,
    #[ts(type = "number | null")]
    pub low: Option<f64>,
    #[ts(type = "number | null")]
    pub volume: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolNewsItemDto {
    pub title: String,
    pub link: String,
    pub source: String,
    pub image: Option<String>,
    pub time: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolRecommendationDto {
    pub symbol: String,
    pub name: Option<String>,
    #[ts(type = "number | null")]
    pub score: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolChartDto {
    pub range: String,
    pub points: Vec<ChartPointDto>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolPageResponse {
    pub symbol: String,
    pub quote: Option<SymbolQuoteDto>,
    pub quote_error: Option<String>,
    pub chart: SymbolChartDto,
    pub news: Vec<SymbolNewsItemDto>,
    pub recommendations: Vec<SymbolRecommendationDto>,
    pub available_ranges: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolChartResponse {
    pub symbol: String,
    pub range: String,
    pub points: Vec<ChartPointDto>,
}

/// Keeps only known chart windows; unknown values become [`DEFAULT_CHART_RANGE`].
///
/// Returns A key from [`CHART_RANGES`].
#[must_use]
pub fn normalize_chart_range(range: &str) -> String {
    let range = range.trim().to_ascii_lowercase();
    if CHART_RANGES.contains(&range.as_str()) {
        range
    } else {
        DEFAULT_CHART_RANGE.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_chart_range_keeps_known_windows() {
        assert_eq!(normalize_chart_range("1y"), "1y");
        assert_eq!(normalize_chart_range(" YTD "), "ytd");
    }

    #[test]
    fn normalize_chart_range_falls_back_to_one_month() {
        assert_eq!(normalize_chart_range("bogus"), DEFAULT_CHART_RANGE);
        assert_eq!(normalize_chart_range(""), DEFAULT_CHART_RANGE);
    }
}
