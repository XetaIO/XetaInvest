use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::watchlist_sections::{Entity, Model};
use crate::validation::rules::{field_error, from_txn};

pub struct UpdateWatchlistSectionAction;

impl UpdateWatchlistSectionAction {
    /// Renames an owned section (the default one included).
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64, name: String) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let section = Entity::ensure_owner(txn, user_id, id).await?;
                    if Entity::name_taken(txn, section.watchlist_id, &name, Some(section.id))
                        .await?
                    {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }
                    let mut item = section.into_active_model();
                    item.name = Set(name);
                    Ok(item.update(txn).await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
