use super::_entities::portfolios::Column;
pub use super::_entities::portfolios::{ActiveModel, Entity, Model};
use sea_orm::QueryOrder;
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::Expr;
pub type Portfolios = Entity;

/// Max portfolios per user.
pub const MAX_PER_USER: u64 = 20;

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
    /// Lists a user's portfolios (default first, then name).
    ///
    /// Returns owned rows.
    pub async fn list_for_user<C>(db: &C, user_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::UserId.eq(user_id))
            .order_by_desc(Column::IsDefault)
            .order_by_asc(Column::Name)
            .all(db)
            .await
    }

    /// Loads a portfolio only if it belongs to `user_id`.
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

    /// Counts portfolios for a user (limit check).
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

    /// Clears the default flag on every portfolio of `user_id`.
    pub async fn clear_default<C>(db: &C, user_id: i64) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::update_many()
            .col_expr(Column::IsDefault, Expr::value(false))
            .filter(Column::UserId.eq(user_id))
            .filter(Column::IsDefault.eq(true))
            .exec(db)
            .await?;
        Ok(())
    }

    /// Makes the user's oldest portfolio the default (no-op when none is left).
    pub async fn promote_oldest_to_default<C>(db: &C, user_id: i64) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        let Some(oldest) = Entity::find()
            .filter(Column::UserId.eq(user_id))
            .order_by_asc(Column::Id)
            .one(db)
            .await?
        else {
            return Ok(());
        };
        let mut item: ActiveModel = oldest.into();
        item.is_default = sea_orm::ActiveValue::Set(true);
        item.update(db).await?;
        Ok(())
    }
}
