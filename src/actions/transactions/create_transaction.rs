use loco_rs::prelude::*;
use sea_orm::{ActiveEnum, TransactionTrait};

use super::helpers::ParsedInput;
use crate::dtos::transactions::UpsertTransaction;
use crate::models::_entities::{positions, transactions};
use crate::services::transaction_inventory;
use crate::validation::rules::from_txn;

pub struct CreateTransactionAction;

impl CreateTransactionAction {
    /// Adds a buy/sell line to an owned position, then re-checks the holding.
    ///
    /// Unknown or foreign positions are [`Error::NotFound`]; an oversell is a
    /// validation error on `quantity` and nothing is persisted.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        position_id: i64,
        params: UpsertTransaction,
    ) -> Result<transactions::Model> {
        let input = ParsedInput::parse(params)?;
        ctx.db
            .transaction::<_, transactions::Model, Error>(|txn| {
                Box::pin(async move {
                    positions::Entity::find_owned(txn, user_id, position_id)
                        .await?
                        .ok_or(Error::NotFound)?;

                    let row = transactions::ActiveModel {
                        kind: Set(input.kind.to_value()),
                        quantity: Set(input.quantity),
                        unit_price: Set(input.unit_price),
                        executed_at: Set(input.executed_at),
                        notes: Set(input.notes),
                        position_id: Set(position_id),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?;

                    transaction_inventory::validate(txn, position_id).await?;
                    Ok(row)
                })
            })
            .await
            .map_err(from_txn)
    }
}
