use rust_decimal::Decimal;
use ts_rs::TS;

use super::portfolios::PortfolioDto;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardResponse {
    pub portfolios: Vec<PortfolioDto>,
    pub active: Option<DashboardActive>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardActive {
    pub portfolio: DashboardPortfolioSummary,
    pub kpis: DashboardPortfolioKpis,
    pub last_updated: String,
    pub quote_error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardPortfolioSummary {
    #[ts(type = "number")]
    pub id: i64,
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardPortfolioKpis {
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub total_invested: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub current_value: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_pct: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change_pct: Decimal,
    pub display_currency: String,
    pub positions: Vec<DashboardPositionKpis>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardPositionKpis {
    #[ts(type = "number")]
    pub position_id: i64,
    pub instrument: DashboardInstrument,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub avg_cost: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub invested: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub current_value: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_pct: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub daily_change_pct: Decimal,
    pub currency: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub fx_rate: Decimal,
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
    pub daily_change_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub realized_pnl_eur: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub price: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub previous_close: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub realized_pnl: Decimal,
    pub lines: Vec<DashboardLine>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardInstrument {
    #[ts(type = "number")]
    pub id: i64,
    pub symbol: String,
    pub name: String,
    pub currency: String,
    pub exchange: Option<String>,
    pub logo_url: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct DashboardLine {
    #[ts(type = "number")]
    pub transaction_id: i64,
    pub executed_at: String,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub original_quantity: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub remaining_quantity: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub invested: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub current_value: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub pnl_pct: Decimal,
}
