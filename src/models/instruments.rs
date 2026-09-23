use sea_orm::entity::prelude::*;

use super::_entities::instruments::Column;
pub use super::_entities::instruments::{ActiveModel, Entity, Model};

pub type Instruments = Entity;

/// Currency assumed when the provider did not report one.
pub const FALLBACK_CURRENCY: &str = "USD";

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

impl Model {
    /// ISO code the instrument is quoted in, uppercased ([`FALLBACK_CURRENCY`] when blank).
    #[must_use]
    pub fn native_currency(&self) -> String {
        let currency = self.currency.trim();
        if currency.is_empty() {
            FALLBACK_CURRENCY.to_string()
        } else {
            currency.to_ascii_uppercase()
        }
    }
}

impl Entity {
    /// Finds an instrument by its (already uppercased) ticker.
    pub async fn find_by_symbol<C>(db: &C, symbol: &str) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::Symbol.eq(symbol))
            .one(db)
            .await
    }

    /// Loads instruments by id in one query.
    pub async fn find_by_ids<C>(db: &C, ids: &[i64]) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        if ids.is_empty() {
            return Ok(Vec::new());
        }
        Entity::find()
            .filter(Column::Id.is_in(ids.iter().copied()))
            .all(db)
            .await
    }
}
