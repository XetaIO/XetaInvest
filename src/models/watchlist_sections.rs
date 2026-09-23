use super::_entities::watchlist_sections::Column;
pub use super::_entities::watchlist_sections::{ActiveModel, Entity, Model};
use std::collections::HashMap;

use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{Expr, ExprTrait};
use sea_orm::{QueryOrder, QuerySelect};

use crate::models::_entities::watchlists;
use loco_rs::Error;

pub type WatchlistSections = Entity;

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
    /// Lists sections of a watchlist by `position`.
    ///
    /// Returns rows for that list.
    pub async fn list_for_watchlist<C>(db: &C, watchlist_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .order_by_asc(Column::Position)
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Loads a section only if its watchlist belongs to `user_id`.
    ///
    /// Returns the section, or `None`.
    pub async fn find_owned<C>(db: &C, user_id: i64, id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let Some(section) = Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };
        if watchlists::Entity::find_owned(db, user_id, section.watchlist_id)
            .await?
            .is_none()
        {
            return Ok(None);
        }
        Ok(Some(section))
    }

    /// Ownership check for nested section writes.
    ///
    /// Returns the section, or 404.
    pub async fn ensure_owner<C>(db: &C, user_id: i64, id: i64) -> loco_rs::Result<Model>
    where
        C: ConnectionTrait,
    {
        Self::find_owned(db, user_id, id)
            .await?
            .ok_or(Error::NotFound)
    }

    /// Default section of a watchlist (`is_default`).
    ///
    /// Returns the default row, if any.
    pub async fn find_default<C>(db: &C, watchlist_id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .filter(Column::IsDefault.eq(true))
            .one(db)
            .await
    }

    /// Whether `name` is already used inside this watchlist.
    ///
    /// Returns `true` when the name is taken.
    pub async fn name_taken<C>(
        db: &C,
        watchlist_id: i64,
        name: &str,
        except_id: Option<i64>,
    ) -> Result<bool, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut query = Entity::find()
            .filter(Column::WatchlistId.eq(watchlist_id))
            .filter(Column::Name.eq(name));
        if let Some(id) = except_id {
            query = query.filter(Column::Id.ne(id));
        }
        Ok(query.one(db).await?.is_some())
    }

    /// Sections of several watchlists in one query, by position.
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

    /// Default section id of each watchlist, in one query.
    pub async fn default_ids_by_watchlist<C>(
        db: &C,
        watchlist_ids: &[i64],
    ) -> Result<HashMap<i64, i64>, DbErr>
    where
        C: ConnectionTrait,
    {
        if watchlist_ids.is_empty() {
            return Ok(HashMap::new());
        }
        let pairs: Vec<(i64, i64)> = Entity::find()
            .select_only()
            .column(Column::WatchlistId)
            .column(Column::Id)
            .filter(Column::WatchlistId.is_in(watchlist_ids.iter().copied()))
            .filter(Column::IsDefault.eq(true))
            .into_tuple()
            .all(db)
            .await?;
        Ok(pairs.into_iter().collect())
    }

    /// Position after the last section of a watchlist (`0` when empty).
    pub async fn next_position<C>(db: &C, watchlist_id: i64) -> Result<i64, DbErr>
    where
        C: ConnectionTrait,
    {
        let last: Option<Option<i64>> = Entity::find()
            .select_only()
            .column_as(Column::Position.max(), "last")
            .filter(Column::WatchlistId.eq(watchlist_id))
            .into_tuple()
            .one(db)
            .await?;
        Ok(last.flatten().map_or(0, |position| position + 1))
    }

    /// Closes the gap left at `removed_position` in a watchlist.
    pub async fn compact_after<C>(
        db: &C,
        watchlist_id: i64,
        removed_position: i64,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::update_many()
            .col_expr(Column::Position, Expr::col(Column::Position).sub(1))
            .filter(Column::WatchlistId.eq(watchlist_id))
            .filter(Column::Position.gt(removed_position))
            .exec(db)
            .await?;
        Ok(())
    }
}
