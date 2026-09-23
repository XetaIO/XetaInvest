use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::transactions::Entity;
use crate::services::transaction_inventory;
use crate::validation::rules::from_txn;

pub struct DeleteTransactionAction;

impl DeleteTransactionAction {
    /// Deletes an owned transaction, then re-checks the holding (deleting a
    /// buy can make a later sell invalid).
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let row = Entity::find_owned(txn, user_id, id)
                        .await?
                        .ok_or(Error::NotFound)?;
                    let position_id = row.position_id;
                    row.delete(txn).await?;
                    transaction_inventory::validate(txn, position_id).await?;
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}
