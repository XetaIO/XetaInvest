use chrono::NaiveDate;
use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::dtos::transactions::UpsertTransaction;
use crate::models::transactions::TransactionKind;
use crate::validation::rules::to_iso_date;

/// A validated transaction body, converted to persistence types.
pub(super) struct ParsedInput {
    pub kind: TransactionKind,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub executed_at: NaiveDate,
    pub notes: Option<String>,
}

impl ParsedInput {
    pub(super) fn parse(input: UpsertTransaction) -> Result<Self> {
        Ok(Self {
            kind: input.kind,
            quantity: input.quantity,
            unit_price: input.unit_price,
            executed_at: to_iso_date(&input.executed_at, "executed_at")?,
            notes: input.notes,
        })
    }
}
