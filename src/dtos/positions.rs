use rust_decimal::Decimal;
use ts_rs::TS;
use validator::Validate;

use crate::models::_entities::positions;
use crate::validation::rules::{
    iso_date_not_future, positive_amount, trim_opt_string, trim_string,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct PositionDto {
    #[ts(type = "number")]
    pub id: i64,
    #[ts(type = "number")]
    pub portfolio_id: i64,
    #[ts(type = "number")]
    pub instrument_id: i64,
}

impl From<positions::Model> for PositionDto {
    fn from(m: positions::Model) -> Self {
        Self {
            id: m.id,
            portfolio_id: m.portfolio_id,
            instrument_id: m.instrument_id,
        }
    }
}

/// Body of `POST /api/portfolios/{id}/positions`: a ticker plus its buy lots.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CreatePosition {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, message = "is required"))]
    pub symbol: String,
    #[validate(length(min = 1, message = "must have at least 1 item"), nested)]
    pub lines: Vec<CreatePositionLine>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CreatePositionLine {
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    #[validate(custom(function = "positive_amount"))]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    #[validate(custom(function = "positive_amount"))]
    pub unit_price: Decimal,
    #[serde(deserialize_with = "trim_string")]
    #[validate(custom(function = "iso_date_not_future"))]
    pub executed_at: String,
    #[serde(default, deserialize_with = "trim_opt_string")]
    #[validate(length(max = 500, message = "must be at most 500 characters"))]
    pub notes: Option<String>,
}
