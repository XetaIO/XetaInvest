use rust_decimal::Decimal;
use sea_orm::DbErr;
use ts_rs::TS;
use validator::Validate;

use crate::models::_entities::transactions;
use crate::models::transactions::TransactionKind;
use crate::validation::rules::{
    iso_date_not_future, positive_amount, trim_opt_string, trim_string,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct TransactionDto {
    #[ts(type = "number")]
    pub id: i64,
    pub kind: TransactionKind,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub quantity: Decimal,
    #[serde(with = "rust_decimal::serde::float")]
    #[ts(type = "number")]
    pub unit_price: Decimal,
    pub executed_at: String,
    pub notes: Option<String>,
    #[ts(type = "number")]
    pub position_id: i64,
}

impl TryFrom<transactions::Model> for TransactionDto {
    type Error = DbErr;

    fn try_from(m: transactions::Model) -> Result<Self, Self::Error> {
        Ok(Self {
            id: m.id,
            kind: m.kind()?,
            quantity: m.quantity,
            unit_price: m.unit_price,
            executed_at: m.executed_at.to_string(),
            notes: m.notes,
            position_id: m.position_id,
        })
    }
}

/// Body of `POST /api/positions/{id}/transactions` and `PUT /api/transactions/{id}`.
///
/// Amounts accept a JSON number or a decimal string and are never rounded
/// through `f64`.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct UpsertTransaction {
    pub kind: TransactionKind,
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
