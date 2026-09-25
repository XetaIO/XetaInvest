use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlist_sections;
use crate::models::_entities::watchlists::{ActiveModel, Entity, Model};
use crate::models::watchlists::{DEFAULT_SECTION_NAME, MAX_PER_USER};
use crate::validation::rules::{field_error, from_txn};

pub struct CreateWatchlistAction;

impl CreateWatchlistAction {
    /// Creates a watchlist (last position) with its default section.
    ///
    /// Enforces the per-user cap and a unique name.
    pub async fn run(ctx: &AppContext, user_id: i64, name: String) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    if Entity::count_for_user(txn, user_id).await? >= MAX_PER_USER {
                        return Err(field_error(
                            "name",
                            "limit",
                            "The maximum number of watchlists has been reached.",
                        ));
                    }
                    if Entity::name_taken(txn, user_id, &name, None).await? {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }

                    let watchlist = ActiveModel {
                        user_id: Set(user_id),
                        name: Set(name),
                        position: Set(Entity::next_position(txn, user_id).await?),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?;

                    watchlist_sections::ActiveModel {
                        watchlist_id: Set(watchlist.id),
                        name: Set(DEFAULT_SECTION_NAME.to_string()),
                        position: Set(0),
                        is_default: Set(true),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?;

                    Ok(watchlist)
                })
            })
            .await
            .map_err(from_txn)
    }
}
