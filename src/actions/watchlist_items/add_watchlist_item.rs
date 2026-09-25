use axum::http::StatusCode;
use loco_rs::prelude::*;
use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::models::_entities::instruments;
use crate::models::_entities::watchlist_items::{ActiveModel, Entity};
use crate::models::_entities::{watchlist_sections, watchlists};
use crate::models::watchlists::MAX_ITEMS;
use crate::services::instrument_resolver;
use crate::validation::rules::{field_error, from_txn};

pub struct AddWatchlistItemAction;

/// What adding a ticker did; failures are [`Error::Validation`] instead.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
#[ts(
    export,
    export_to = "../frontend/src/bindings/",
    rename_all = "snake_case"
)]
pub enum AddWatchlistItemStatus {
    Added,
    Moved,
    AlreadyPresent,
}

impl AddWatchlistItemStatus {
    /// `201 Created` for a new row, `200 OK` otherwise.
    #[must_use]
    pub fn status_code(self) -> StatusCode {
        match self {
            Self::Added => StatusCode::CREATED,
            Self::Moved | Self::AlreadyPresent => StatusCode::OK,
        }
    }
}

impl AddWatchlistItemAction {
    /// Adds a ticker to a section of an owned watchlist.
    ///
    /// The ticker is resolved through the market provider. If it is already
    /// on the watchlist it is moved to `section_id` (or left alone when it is
    /// already there).
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        watchlist_id: i64,
        section_id: i64,
        symbol: &str,
    ) -> Result<AddWatchlistItemStatus> {
        let instrument = resolve_instrument(ctx, symbol).await?;

        ctx.db
            .transaction::<_, AddWatchlistItemStatus, Error>(|txn| {
                Box::pin(async move {
                    let watchlist =
                        watchlists::Entity::ensure_watchlist_owner(txn, user_id, watchlist_id)
                            .await?;
                    let section = watchlist_sections::Entity::find_by_id(section_id)
                        .one(txn)
                        .await?
                        .filter(|section| section.watchlist_id == watchlist.id)
                        .ok_or_else(|| {
                            field_error("section_id", "invalid", "The selected section is invalid.")
                        })?;

                    if let Some(existing) =
                        Entity::find_by_instrument(txn, watchlist.id, instrument.id).await?
                    {
                        if existing.watchlist_section_id == section.id {
                            return Ok(AddWatchlistItemStatus::AlreadyPresent);
                        }
                        let (old_section_id, old_position) =
                            (existing.watchlist_section_id, existing.position);
                        let mut item = existing.into_active_model();
                        item.watchlist_section_id = Set(section.id);
                        item.position = Set(Entity::next_position(txn, section.id).await?);
                        item.update(txn).await?;
                        Entity::compact_after(txn, old_section_id, old_position).await?;
                        return Ok(AddWatchlistItemStatus::Moved);
                    }

                    if Entity::count_for_watchlist(txn, watchlist.id).await? >= MAX_ITEMS {
                        return Err(field_error(
                            "symbol",
                            "limit",
                            "The maximum number of watchlist items has been reached.",
                        ));
                    }

                    ActiveModel {
                        watchlist_id: Set(watchlist.id),
                        watchlist_section_id: Set(section.id),
                        instrument_id: Set(instrument.id),
                        position: Set(Entity::next_position(txn, section.id).await?),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?;
                    Ok(AddWatchlistItemStatus::Added)
                })
            })
            .await
            .map_err(from_txn)
    }
}

/// Resolves the ticker, reporting every failure as "Symbol not found." on `symbol`.
async fn resolve_instrument(ctx: &AppContext, symbol: &str) -> Result<instruments::Model> {
    match instrument_resolver::resolve(ctx, symbol).await {
        Ok(Some(instrument)) => Ok(instrument),
        Ok(None) => Err(field_error("symbol", "not_found", "Symbol not found.")),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "instrument resolve failed");
            Err(field_error("symbol", "not_found", "Symbol not found."))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_new_item_is_created() {
        assert_eq!(
            AddWatchlistItemStatus::Added.status_code(),
            StatusCode::CREATED
        );
        assert_eq!(AddWatchlistItemStatus::Moved.status_code(), StatusCode::OK);
        assert_eq!(
            AddWatchlistItemStatus::AlreadyPresent.status_code(),
            StatusCode::OK
        );
    }

    #[test]
    fn status_serializes_snake_case() {
        assert_eq!(
            serde_json::to_string(&AddWatchlistItemStatus::AlreadyPresent).unwrap(),
            "\"already_present\""
        );
    }
}
