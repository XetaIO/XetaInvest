use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// One symbol hit returned by `GET /api/symbol-search`.
///
/// Field names match the payload so the existing React `GlobalSearch` can consume this endpoint unchanged.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolSearchResult {
    pub symbol: String,
    pub name: Option<String>,
    pub exchange: Option<String>,
    #[serde(rename = "type")]
    #[ts(rename = "type")]
    pub quote_type: Option<String>,
    pub logo_url: Option<String>,
}

/// Envelope for `GET /api/symbol-search`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SymbolSearchResponse {
    pub data: Vec<SymbolSearchResult>,
}

/// Quote fields the SPA needs (watchlist, dashboard, ticker). Stable contract:
/// crate `Quote` types are mapped here and never leaked to JSON.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct QuoteDto {
    pub symbol: String,
    pub name: Option<String>,
    pub exchange: Option<String>,
    pub quote_type: Option<String>,
    pub currency: Option<String>,
    pub regular_market_price: Option<f64>,
    pub regular_market_change: Option<f64>,
    pub regular_market_change_percent: Option<f64>,
    pub regular_market_previous_close: Option<f64>,
    pub logo_url: Option<String>,
}

/// Live tick forwarded on `GET /api/stream` (crate
/// `finance_query::streaming::PriceUpdate` mapped onto a stable JSON contract).
///
/// Field names match the Yahoo camelCase payload so the SPA parser
/// stays the same (`changePercent`, `openPrice`, …).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct PriceTickDto {
    pub id: String,
    #[ts(type = "number")]
    pub price: f64,
    #[ts(type = "number")]
    pub change: f64,
    #[ts(type = "number")]
    pub change_percent: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub day_high: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub day_low: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub day_volume: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub open_price: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub previous_close: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exchange: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub market_hours: Option<String>,
    /// Unix milliseconds (crate `PriceUpdate.time`).
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(type = "number | null")]
    pub time: Option<i64>,
}

/// Envelope for `GET /api/quotes`.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct QuotesResponse {
    pub quotes: HashMap<String, QuoteDto>,
    pub fetched_at: String,
}
