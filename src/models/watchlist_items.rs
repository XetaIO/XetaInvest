use loco_rs::Error;
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{Expr, ExprTrait};
use sea_orm::{QueryOrder, QuerySelect};

use super::_entities::watchlist_items::Column;
pub use super::_entities::watchlist_items::{ActiveModel, Entity, Model};
use crate::models::_entities::{instruments, watchlists};

pub type WatchlistItems = Entity;

#[async_trait::async_trait]
impl ActiveModelBehavior for ActiveModel {
    async fn before_save<C>(self, _db: &C, insert: bool) -> std::result::Result<Self, DbErr>
    where
        C: ConnectionTrait,
    {
        if !insert && self.updated_at.is_unchanged() {
            let mut this = self;
            this.updated_at = sea_orm::ActiveValue::Set(chrono::Utc::now().into());
            Ok(this)
        } else {
            Ok(self)
        }
    }
}

impl Entity {
    /// Items of a watchlist, ordered by section then position.
    pub async fn list_for_watchlist<C>(db: &C, watchlist_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .order_by_asc(Column::WatchlistSectionId)
            .order_by_asc(Column::Position)
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Items of several watchlists in one query, ordered by position.
    pub async fn list_for_watchlists<C>(db: &C, watchlist_ids: &[i64]) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        if watchlist_ids.is_empty() {
            return Ok(Vec::new());
        }
        Entity::find()
            .filter(Column::WatchlistId.is_in(watchlist_ids.iter().copied()))
            .order_by_asc(Column::Position)
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Number of items on a watchlist (limit check).
    pub async fn count_for_watchlist<C>(db: &C, watchlist_id: i64) -> Result<u64, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .count(db)
            .await
    }

    /// Items of one section, by position.
    pub async fn list_for_section<C>(db: &C, section_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistSectionId.eq(section_id))
            .order_by_asc(Column::Position)
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Position after the last item of a section (`0` for an empty section).
    pub async fn next_position<C>(db: &C, section_id: i64) -> Result<i64, DbErr>
    where
        C: ConnectionTrait,
    {
        let last: Option<Option<i64>> = Entity::find()
            .select_only()
            .column_as(Column::Position.max(), "last")
            .filter(Column::WatchlistSectionId.eq(section_id))
            .into_tuple()
            .one(db)
            .await?;
        Ok(last.flatten().map_or(0, |position| position + 1))
    }

    /// Loads an item only if its watchlist belongs to `user_id`.
    pub async fn find_owned<C>(db: &C, user_id: i64, id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let Some(item) = Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };
        let owned = watchlists::Entity::find_owned(db, user_id, item.watchlist_id)
            .await?
            .is_some();
        Ok(owned.then_some(item))
    }

    /// Like [`Self::find_owned`], but unknown and foreign items are [`Error::NotFound`].
    pub async fn ensure_owner<C>(db: &C, user_id: i64, id: i64) -> loco_rs::Result<Model>
    where
        C: ConnectionTrait,
    {
        Self::find_owned(db, user_id, id)
            .await?
            .ok_or(Error::NotFound)
    }

    /// The item for an instrument on a watchlist (the pair is unique).
    pub async fn find_by_instrument<C>(
        db: &C,
        watchlist_id: i64,
        instrument_id: i64,
    ) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .filter(Column::InstrumentId.eq(instrument_id))
            .one(db)
            .await
    }

    /// Uppercased tickers present on any of the user's watchlists.
    pub async fn symbols_for_user<C>(db: &C, user_id: i64) -> Result<Vec<String>, DbErr>
    where
        C: ConnectionTrait,
    {
        let symbols: Vec<String> = instruments::Entity::find()
            .select_only()
            .column(instruments::Column::Symbol)
            .distinct()
            .join(
                sea_orm::JoinType::InnerJoin,
                instruments::Relation::WatchlistItems.def(),
            )
            .join(
                sea_orm::JoinType::InnerJoin,
                super::_entities::watchlist_items::Relation::Watchlists.def(),
            )
            .filter(watchlists::Column::UserId.eq(user_id))
            .into_tuple()
            .all(db)
            .await?;
        Ok(symbols
            .into_iter()
            .map(|symbol| symbol.to_ascii_uppercase())
            .collect())
    }

    /// Closes the gap left at `removed_position` in a section.
    pub async fn compact_after<C>(
        db: &C,
        section_id: i64,
        removed_position: i64,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::update_many()
            .col_expr(Column::Position, Expr::col(Column::Position).sub(1))
            .filter(Column::WatchlistSectionId.eq(section_id))
            .filter(Column::Position.gt(removed_position))
            .exec(db)
            .await?;
        Ok(())
    }
}
