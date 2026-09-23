use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::portfolios::Entity;
use crate::validation::rules::from_txn;

pub struct DeletePortfolioAction;

impl DeletePortfolioAction {
    /// Deletes an owned portfolio (positions and transactions cascade).
    ///
    /// When the default is deleted, the oldest remaining portfolio becomes
    /// the default.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let portfolio = Entity::find_owned(txn, user_id, id)
                        .await?
                        .ok_or(Error::NotFound)?;
                    let was_default = portfolio.is_default;
                    portfolio.delete(txn).await?;
                    if was_default {
                        Entity::promote_oldest_to_default(txn, user_id).await?;
                    }
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}
