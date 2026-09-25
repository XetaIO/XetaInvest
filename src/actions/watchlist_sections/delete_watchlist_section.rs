use loco_rs::prelude::*;
use sea_orm::TransactionTrait;
use sea_orm::sea_query::{Expr, ExprTrait};

use crate::models::_entities::watchlist_items;
use crate::models::_entities::watchlist_sections::Entity;
use crate::validation::rules::{field_error, from_txn};

pub struct DeleteWatchlistSectionAction;

impl DeleteWatchlistSectionAction {
    /// Deletes an owned, non-default section.
    ///
    /// Its items are appended (in order) to the default section, then the gap
    /// in the section order is closed.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        ctx.db
            .transaction::<_, (), Error>(|txn| {
                Box::pin(async move {
                    let section = Entity::ensure_owner(txn, user_id, id).await?;
                    if section.is_default {
                        return Err(field_error(
                            "section",
                            "invalid",
                            "The default section cannot be deleted.",
                        ));
                    }
                    let default = Entity::find_default(txn, section.watchlist_id)
                        .await?
                        .ok_or(Error::NotFound)?;

                    // Moved items keep their relative order after the default's last item.
                    let offset = watchlist_items::Entity::next_position(txn, default.id).await?;
                    watchlist_items::Entity::update_many()
                        .col_expr(
                            watchlist_items::Column::WatchlistSectionId,
                            Expr::value(default.id),
                        )
                        .col_expr(
                            watchlist_items::Column::Position,
                            Expr::col(watchlist_items::Column::Position).add(offset),
                        )
                        .filter(watchlist_items::Column::WatchlistSectionId.eq(section.id))
                        .exec(txn)
                        .await?;

                    let (watchlist_id, position) = (section.watchlist_id, section.position);
                    section.delete(txn).await?;
                    Entity::compact_after(txn, watchlist_id, position).await?;
                    Ok(())
                })
            })
            .await
            .map_err(from_txn)
    }
}
