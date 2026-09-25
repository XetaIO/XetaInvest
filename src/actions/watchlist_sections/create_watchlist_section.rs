use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlist_sections::{ActiveModel, Entity, Model};
use crate::models::_entities::watchlists;
use crate::validation::rules::{field_error, from_txn};

pub struct CreateWatchlistSectionAction;

impl CreateWatchlistSectionAction {
    /// Appends a (non-default) section to an owned watchlist.
    ///
    /// Section names are unique within their watchlist.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        watchlist_id: i64,
        name: String,
    ) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let watchlist =
                        watchlists::Entity::ensure_watchlist_owner(txn, user_id, watchlist_id)
                            .await?;
                    if Entity::name_taken(txn, watchlist.id, &name, None).await? {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }
                    Ok(ActiveModel {
                        watchlist_id: Set(watchlist.id),
                        name: Set(name),
                        position: Set(Entity::next_position(txn, watchlist.id).await?),
                        is_default: Set(false),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
