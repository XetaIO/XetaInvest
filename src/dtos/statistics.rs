//! Payload of `GET /api/statistics`: totals, allocations, movers and value history in EUR.

use rust_decimal::Decimal;
use ts_rs::TS;

use super::portfolios::PortfolioDto;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct StatisticsResponse {
    pub portfolios: Vec<PortfolioDto>,
    pub scope: StatisticsScope,
    pub totals: StatisticsTotals,
    pub allocations: StatisticsAllocations,
    pub performance: StatisticsPerformance,
    pub history: Vec<HistoryPointDto>,
    pub generated_at: String,
    pub quote_error: Option<String>,
}

/// What the statistics cover: every portfolio of the user, or a single one.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, TS)]
#[serde(tag = "type", rename_all = "lowercase")]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub enum StatisticsScope {
    All,
    Portfolio {
        #[ts(type = "number")]
        id: i64,
        name: String,
    },
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct StatisticsTotals {
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub invested_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub current_value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_pct: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change_pct: Decimal,
    pub position_count: u32,
    pub instrument_count: u32,
    pub portfolio_count: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct StatisticsAllocations {
    pub by_instrument: Vec<InstrumentAllocation>,
    pub by_currency: Vec<CurrencyAllocation>,
    pub by_type: Vec<TypeAllocation>,
    /// Only filled for the `all` scope.
    pub by_portfolio: Vec<PortfolioAllocation>,
}

/// One instrument, merged across portfolios.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct InstrumentAllocation {
    pub symbol: String,
    pub name: String,
    pub currency: String,
    /// Lowercase quote type (`equity`, `etf`, ...); `stock` when unknown.
    pub asset_type: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub invested_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_pct: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub percent: Decimal,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CurrencyAllocation {
    pub currency: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub percent: Decimal,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct TypeAllocation {
    pub asset_type: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub percent: Decimal,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct PortfolioAllocation {
    #[ts(type = "number")]
    pub portfolio_id: i64,
    pub name: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub percent: Decimal,
}

/// Best and worst instruments by P&L percentage (at most 5 each).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct StatisticsPerformance {
    pub top_gainers: Vec<InstrumentAllocation>,
    pub top_losers: Vec<InstrumentAllocation>,
}

/// Portfolio value on one day (`YYYY-MM-DD`).
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct HistoryPointDto {
    pub date: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub value_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub invested_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_eur: Decimal,
}
