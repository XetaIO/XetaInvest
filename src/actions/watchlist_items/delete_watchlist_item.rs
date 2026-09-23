use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlist_items::Entity;
use crate::validation::rules::from_txn;

pub struct DeleteWatchlistItemAction;

impl DeleteWatchlistItemAction {
    /// Removes an owned item and closes the gap in its section.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let item = Entity::ensure_owner(txn, user_id, id).await?;
                    let (section_id, position) = (item.watchlist_section_id, item.position);
                    item.delete(txn).await?;
                    Entity::compact_after(txn, section_id, position).await?;
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}
