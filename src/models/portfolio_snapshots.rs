use chrono::NaiveDate;
use sea_orm::entity::prelude::*;
use sea_orm::sea_query::OnConflict;
use sea_orm::{ActiveValue::Set, QueryOrder};

use super::_entities::portfolio_snapshots::Column;
pub use super::_entities::portfolio_snapshots::{ActiveModel, Entity, Model};
pub type PortfolioSnapshots = Entity;

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

/// EUR figures of one daily capture (the key is passed separately).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SnapshotValues {
    pub invested_eur: Decimal,
    pub current_value_eur: Decimal,
    pub pnl_eur: Decimal,
    pub position_count: i16,
}

impl Entity {
    /// Inserts or overwrites the snapshot of `portfolio_id` for `captured_on`.
    ///
    /// Idempotent: a second capture of the same day updates the existing row
    /// (and clears `quote_error`). Returns the stored row.
    pub async fn upsert_for_day<C>(
        db: &C,
        portfolio_id: i64,
        captured_on: NaiveDate,
        values: SnapshotValues,
    ) -> Result<Model, DbErr>
    where
        C: ConnectionTrait,
    {
        let row = ActiveModel {
            portfolio_id: Set(portfolio_id),
            captured_on: Set(captured_on),
            invested_eur: Set(values.invested_eur),
            current_value_eur: Set(values.current_value_eur),
            pnl_eur: Set(values.pnl_eur),
            position_count: Set(values.position_count),
            quote_error: Set(false),
            updated_at: Set(chrono::Utc::now().into()),
            ..Default::default()
        };
        Entity::insert(row)
            .on_conflict(
                OnConflict::columns([Column::PortfolioId, Column::CapturedOn])
                    .update_columns([
                        Column::InvestedEur,
                        Column::CurrentValueEur,
                        Column::PnlEur,
                        Column::PositionCount,
                        Column::QuoteError,
                        Column::UpdatedAt,
                    ])
                    .to_owned(),
            )
            .exec(db)
            .await?;
        Entity::find()
            .filter(Column::PortfolioId.eq(portfolio_id))
            .filter(Column::CapturedOn.eq(captured_on))
            .one(db)
            .await?
            .ok_or_else(|| DbErr::RecordNotFound("portfolio snapshot after upsert".to_string()))
    }

    /// Lists snapshots of `portfolio_ids` captured on or after `since`.
    ///
    /// Returns rows ordered by capture date (oldest first); empty when no id is given.
    pub async fn list_since<C>(
        db: &C,
        portfolio_ids: &[i64],
        since: NaiveDate,
    ) -> Result<Vec<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        if portfolio_ids.is_empty() {
            return Ok(Vec::new());
        }
        Entity::find()
            .filter(Column::PortfolioId.is_in(portfolio_ids.iter().copied()))
            .filter(Column::CapturedOn.gte(since))
            .order_by_asc(Column::CapturedOn)
            .order_by_asc(Column::PortfolioId)
            .all(db)
            .await
    }
}
