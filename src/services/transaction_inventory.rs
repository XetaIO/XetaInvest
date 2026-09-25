//! Guards a position against negative holdings.
//!
//! Lots are replayed in execution order (`executed_at`, then `id`); a sell
//! larger than the quantity held at that point is rejected. Amounts are exact
//! [`Decimal`]s, so no tolerance is needed.

use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::models::_entities::transactions::Entity;
use crate::models::transactions::{Lot, TransactionKind};
use crate::validation::rules::field_error;

/// Replays the stored lots of `position_id` and rejects a negative holding.
pub async fn validate<C>(db: &C, position_id: i64) -> Result<()>
where
    C: ConnectionTrait,
{
    let lots = Entity::list_for_position(db, position_id).await?;
    validate_lots(&lots)
}

/// Pure replay behind [`validate`].
pub fn validate_lots(lots: &[Lot]) -> Result<()> {
    let mut held = Decimal::ZERO;
    for lot in lots {
        match lot.kind {
            TransactionKind::Buy => held += lot.quantity,
            TransactionKind::Sell if lot.quantity > held => {
                return Err(field_error(
                    "quantity",
                    "negative_holding",
                    "This operation would create a negative holding quantity on the selected date.",
                ));
            }
            TransactionKind::Sell => held -= lot.quantity,
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::*;

    fn lot(kind: TransactionKind, quantity: &str) -> Lot {
        Lot {
            transaction_id: 0,
            kind,
            quantity: quantity.parse().unwrap(),
            unit_price: Decimal::ONE,
            executed_at: NaiveDate::from_ymd_opt(2026, 1, 1).unwrap(),
        }
    }

    fn buy(quantity: &str) -> Lot {
        lot(TransactionKind::Buy, quantity)
    }

    fn sell(quantity: &str) -> Lot {
        lot(TransactionKind::Sell, quantity)
    }

    #[test]
    fn buys_then_partial_sell_is_ok() {
        assert!(validate_lots(&[buy("10"), sell("4")]).is_ok());
    }

    #[test]
    fn selling_exactly_the_fractional_holding_is_ok() {
        assert!(validate_lots(&[buy("0.1"), buy("0.2"), sell("0.3")]).is_ok());
    }

    #[test]
    fn selling_more_than_held_fails_on_quantity() {
        match validate_lots(&[buy("2"), sell("2.0001")]).unwrap_err() {
            Error::Validation(errors) => assert!(errors.errors.contains_key("quantity")),
            other => panic!("expected validation, got {other:?}"),
        }
    }

    #[test]
    fn order_matters_sell_before_buy_fails() {
        assert!(validate_lots(&[sell("1"), buy("1")]).is_err());
    }
}
