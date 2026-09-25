use std::collections::HashMap;

use chrono::NaiveDate;
use rust_decimal::Decimal;
use sea_orm::QueryOrder;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub use super::_entities::transactions::{ActiveModel, Entity, Model};
use super::_entities::{positions, transactions::Column};

pub type Transactions = Entity;

/// Side of a transaction, stored as `buy` / `sell` (guarded by a CHECK constraint).
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize, TS,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[serde(rename_all = "lowercase")]
#[ts(
    export,
    export_to = "../frontend/src/bindings/",
    rename_all = "lowercase"
)]
pub enum TransactionKind {
    #[sea_orm(string_value = "buy")]
    Buy,
    #[sea_orm(string_value = "sell")]
    Sell,
}

/// A transaction row with its side parsed: the input of every holding computation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Lot {
    pub transaction_id: i64,
    pub kind: TransactionKind,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub executed_at: NaiveDate,
}

impl TryFrom<&Model> for Lot {
    type Error = DbErr;

    fn try_from(row: &Model) -> Result<Self, Self::Error> {
        Ok(Self {
            transaction_id: row.id,
            kind: row.kind()?,
            quantity: row.quantity,
            unit_price: row.unit_price,
            executed_at: row.executed_at,
        })
    }
}

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
    /// Typed side of this row.
    ///
    /// # Errors
    ///
    /// [`DbErr::Type`] if the stored value is neither `buy` nor `sell`.
    pub fn kind(&self) -> Result<TransactionKind, DbErr> {
        TransactionKind::try_from_value(&self.kind)
    }
}

impl Entity {
    /// A position's lots in execution order (`executed_at`, then `id`).
    pub async fn list_for_position<C>(db: &C, position_id: i64) -> Result<Vec<Lot>, DbErr>
    where
        C: ConnectionTrait,
    {
        Entity::find()
            .filter(Column::PositionId.eq(position_id))
            .order_by_asc(Column::ExecutedAt)
            .order_by_asc(Column::Id)
            .all(db)
            .await?
            .iter()
            .map(Lot::try_from)
            .collect()
    }

    /// Lots of several positions in one query, grouped by position and in
    /// execution order.
    pub async fn lots_by_position<C>(
        db: &C,
        position_ids: &[i64],
    ) -> Result<HashMap<i64, Vec<Lot>>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut grouped: HashMap<i64, Vec<Lot>> = HashMap::new();
        if position_ids.is_empty() {
            return Ok(grouped);
        }
        let rows = Entity::find()
            .filter(Column::PositionId.is_in(position_ids.iter().copied()))
            .order_by_asc(Column::ExecutedAt)
            .order_by_asc(Column::Id)
            .all(db)
            .await?;
        for row in &rows {
            grouped
                .entry(row.position_id)
                .or_default()
                .push(Lot::try_from(row)?);
        }
        Ok(grouped)
    }

    /// Loads a transaction only if its portfolio belongs to `user_id`.
    pub async fn find_owned<C>(db: &C, user_id: i64, id: i64) -> Result<Option<Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let Some(row) = Entity::find_by_id(id).one(db).await? else {
            return Ok(None);
        };
        let owned = positions::Entity::find_owned(db, user_id, row.position_id)
            .await?
            .is_some();
        Ok(owned.then_some(row))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kind_round_trips_through_its_storage_value() {
        for kind in [TransactionKind::Buy, TransactionKind::Sell] {
            assert_eq!(TransactionKind::try_from_value(&kind.to_value()), Ok(kind));
        }
        assert_eq!(TransactionKind::Sell.to_value(), "sell");
    }

    #[test]
    fn unknown_kind_is_an_error_not_a_buy() {
        assert!(TransactionKind::try_from_value(&"hold".to_string()).is_err());
    }

    #[test]
    fn kind_serializes_lowercase() {
        assert_eq!(
            serde_json::to_string(&TransactionKind::Buy).unwrap(),
            "\"buy\""
        );
    }
}
