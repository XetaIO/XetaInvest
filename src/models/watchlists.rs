use super::_entities::watchlists::Column;
pub use super::_entities::watchlists::{ActiveModel, Entity, Model};
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::{Expr, ExprTrait};
use sea_orm::{QueryOrder, QuerySelect};

use loco_rs::Error;

pub type Watchlists = Entity;

/// Max watchlists per user.
pub const MAX_PER_USER: u64 = 10;
/// Max items per watchlist.
pub const MAX_ITEMS: u64 = 25;
/// Section created with every new watchlist.
pub const DEFAULT_SECTION_NAME: &str = "Général";

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
    /// Lists a user's watchlists by `position`.
    ///
    /// Returns owned rows.
    pub async fn list_for_user<C>(db: &C, user_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .order_by_asc(Column::Position)
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Loads a watchlist only if it belongs to `user_id`.
    ///
    /// Returns the row, or `None` (unknown or someone else's).
    pub async fn find_owned<C>(db: &C, user_id: i64, id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::Id.eq(id))
            .filter(Column::UserId.eq(user_id))
            .one(db)
            .await
    }

    /// Ownership check reused by nested section/item writes.
    ///
    /// Other users' ids look like 404 (same as portfolios).
    ///
    /// Returns the row, or [`Error::NotFound`].
    pub async fn ensure_watchlist_owner<C>(db: &C, user_id: i64, id: i64) -> loco_rs::Result<Model>
    where
        C: ConnectionTrait,
    {
        Self::find_owned(db, user_id, id)
            .await?
            .ok_or(Error::NotFound)
    }

    /// Counts watchlists for a user (limit check).
    ///
    /// Returns number of rows.
    pub async fn count_for_user<C>(db: &C, user_id: i64) -> Result<u64, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .count(db)
            .await
    }

    /// Whether `name` is already used by this user.
    ///
    /// Returns `true` when the name is taken.
    pub async fn name_taken<C>(
        db: &C,
        user_id: i64,
        name: &str,
        except_id: Option<i64>,
    ) -> Result<bool, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut query = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .filter(Column::Name.eq(name));
        if let Some(id) = except_id {
            query = query.filter(Column::Id.ne(id));
        }
        Ok(query.one(db).await?.is_some())
    }

    /// Position after the user's last watchlist (`0` when none).
    pub async fn next_position<C>(db: &C, user_id: i64) -> Result<i64, DbErr>
    where
        C: ConnectionTrait,
    {
        let last: Option<Option<i64>> = Entity::find()
            .select_only()
            .column_as(Column::Position.max(), "last")
            .filter(Column::UserId.eq(user_id))
            .into_tuple()
            .one(db)
            .await?;
        Ok(last.flatten().map_or(0, |position| position + 1))
    }

    /// Closes the gap left at `removed_position` in the user's watchlists.
    pub async fn compact_after<C>(db: &C, user_id: i64, removed_position: i64) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::update_many()
            .col_expr(Column::Position, Expr::col(Column::Position).sub(1))
            .filter(Column::UserId.eq(user_id))
            .filter(Column::Position.gt(removed_position))
            .exec(db)
            .await?;
        Ok(())
    }
}
