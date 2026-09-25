use std::collections::HashMap;

use rust_decimal::Decimal;
use ts_rs::TS;
use validator::Validate;

use crate::actions::watchlist_items::add_watchlist_item::AddWatchlistItemStatus;
use crate::validation::rules::trim_string;

/// One close point for `GET /api/watchlists/history`.
///
/// `t` is unix milliseconds; `v` is the close price.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct SparkPointDto {
    #[ts(type = "number")]
    pub t: i64,
    #[ts(type = "number")]
    pub v: f64,
}

/// Internal spark series (closes + unix-second timestamps) from `MarketData`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SparkSeriesDto {
    pub closes: Vec<f64>,
    pub timestamps: Vec<i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistInstrumentDto {
    #[ts(type = "number")]
    pub id: i64,
    pub symbol: String,
    pub name: String,
    pub exchange: Option<String>,
    pub quote_type: Option<String>,
    pub currency: String,
    pub logo_url: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistItemDto {
    #[ts(type = "number")]
    pub id: i64,
    #[ts(type = "number")]
    pub section_id: i64,
    #[ts(type = "number")]
    pub position: i64,
    pub instrument: WatchlistInstrumentDto,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistSectionDto {
    #[ts(type = "number")]
    pub id: i64,
    pub name: String,
    #[ts(type = "number")]
    pub position: i64,
    pub is_default: bool,
    pub items: Vec<WatchlistItemDto>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistDto {
    #[ts(type = "number")]
    pub id: i64,
    pub name: String,
    #[ts(type = "number")]
    pub position: i64,
    pub sections: Vec<WatchlistSectionDto>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistLimitsDto {
    #[ts(type = "number")]
    pub max_per_user: u64,
    #[ts(type = "number")]
    pub max_items: u64,
}

/// Average cost of open lots for a ticker.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistPositionDto {
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub avg_price: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub quantity: Decimal,
    pub currency: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistPageResponse {
    pub watchlists: Vec<WatchlistDto>,
    #[ts(type = "number | null")]
    pub active_watchlist_id: Option<i64>,
    pub positions: HashMap<String, WatchlistPositionDto>,
    pub limits: WatchlistLimitsDto,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistSummaryDto {
    #[ts(type = "number")]
    pub id: i64,
    pub name: String,
    #[ts(type = "number | null")]
    pub default_section_id: Option<i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistSummaryResponse {
    pub data: Vec<WatchlistSummaryDto>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct WatchlistHistoryResponse {
    pub data: HashMap<String, Vec<SparkPointDto>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CreateWatchlist {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 60, message = "must be at most 60 characters"))]
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct UpdateWatchlist {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 60, message = "must be at most 60 characters"))]
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CreateWatchlistSection {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 60, message = "must be at most 60 characters"))]
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct UpdateWatchlistSection {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 60, message = "must be at most 60 characters"))]
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct AddWatchlistItem {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, message = "is required"))]
    pub symbol: String,
    #[ts(type = "number")]
    pub section_id: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct AddWatchlistItemResponse {
    pub status: AddWatchlistItemStatus,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct ReorderWatchlistSection {
    #[ts(type = "number")]
    pub id: i64,
    #[ts(type = "number[]")]
    pub item_ids: Vec<i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct ReorderWatchlist {
    #[validate(length(min = 1, message = "The watchlist layout is invalid."), nested)]
    pub sections: Vec<ReorderWatchlistSection>,
}
