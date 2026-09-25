use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlists::{Entity, Model};
use crate::validation::rules::{field_error, from_txn};

pub struct UpdateWatchlistAction;

impl UpdateWatchlistAction {
    /// Renames an owned watchlist.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64, name: String) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let watchlist = Entity::ensure_watchlist_owner(txn, user_id, id).await?;
                    if Entity::name_taken(txn, user_id, &name, Some(watchlist.id)).await? {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }
                    let mut item = watchlist.into_active_model();
                    item.name = Set(name);
                    Ok(item.update(txn).await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
