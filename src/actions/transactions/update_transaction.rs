use loco_rs::prelude::*;
use sea_orm::{ActiveEnum, TransactionTrait};

use super::helpers::ParsedInput;
use crate::dtos::transactions::UpsertTransaction;
use crate::models::_entities::transactions::{Entity, Model};
use crate::services::transaction_inventory;
use crate::validation::rules::from_txn;

pub struct UpdateTransactionAction;

impl UpdateTransactionAction {
    /// Replaces an owned transaction, then re-checks the holding.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        id: i64,
        params: UpsertTransaction,
    ) -> Result<Model> {
        let input = ParsedInput::parse(params)?;
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let row = Entity::find_owned(txn, user_id, id)
                        .await?
                        .ok_or(Error::NotFound)?;
                    let position_id = row.position_id;

                    let mut item = row.into_active_model();
                    item.kind = Set(input.kind.to_value());
                    item.quantity = Set(input.quantity);
                    item.unit_price = Set(input.unit_price);
                    item.executed_at = Set(input.executed_at);
                    item.notes = Set(input.notes);
                    let row = item.update(txn).await?;

                    transaction_inventory::validate(txn, position_id).await?;
                    Ok(row)
                })
            })
            .await
            .map_err(from_txn)
    }
}
