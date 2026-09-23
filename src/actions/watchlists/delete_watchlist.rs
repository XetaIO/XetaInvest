use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlists::Entity;
use crate::validation::rules::from_txn;

pub struct DeleteWatchlistAction;

impl DeleteWatchlistAction {
    /// Deletes an owned watchlist (sections and items cascade) and closes the
    /// gap in the user's list order.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let watchlist = Entity::ensure_watchlist_owner(txn, user_id, id).await?;
                    let position = watchlist.position;
                    watchlist.delete(txn).await?;
                    Entity::compact_after(txn, user_id, position).await?;
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}
