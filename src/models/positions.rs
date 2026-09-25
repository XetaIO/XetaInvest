use super::_entities::positions::Column;
pub use super::_entities::positions::{ActiveModel, Entity, Model};
use sea_orm::QueryOrder;
use sea_orm::entity::prelude::*;
pub type Positions = Entity;

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
    /// Finds the unique position for a portfolio × instrument pair.
    ///
    /// Returns existing row, if any.
    pub async fn find_pair<C>(
        db: &C,
        portfolio_id: i64,
        instrument_id: i64,
    ) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::PortfolioId.eq(portfolio_id))
            .filter(Column::InstrumentId.eq(instrument_id))
            .one(db)
            .await
    }

    /// Loads a position only if its portfolio belongs to `user_id`.
    ///
    /// Returns the row, or `None` (unknown or someone else's).
    pub async fn find_owned<C>(db: &C, user_id: i64, id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::Id.eq(id))
            .inner_join(super::_entities::portfolios::Entity)
            .filter(super::_entities::portfolios::Column::UserId.eq(user_id))
            .one(db)
            .await
    }

    /// Lists positions for a portfolio (stable id order).
    ///
    /// Returns rows for that portfolio.
    pub async fn list_for_portfolio<C>(db: &C, portfolio_id: i64) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::PortfolioId.eq(portfolio_id))
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }

    /// Positions of several portfolios in one query.
    pub async fn list_for_portfolios<C>(db: &C, portfolio_ids: &[i64]) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        if portfolio_ids.is_empty() {
            return Ok(Vec::new());
        }
        Entity::find()
            .filter(Column::PortfolioId.is_in(portfolio_ids.iter().copied()))
            .order_by_asc(Column::Id)
            .all(db)
            .await
    }
}
