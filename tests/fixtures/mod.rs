//! Row builders for model and service tests (the seeded users have ids 1 and 2).

use chrono::NaiveDate;
use rust_decimal::Decimal;
use sea_orm::{ActiveEnum, ActiveModelTrait, ActiveValue::Set, DatabaseConnection};
use xeta_invest::models::{
    _entities::{
        instruments, portfolio_snapshots, portfolios, positions, transactions, watchlist_items,
        watchlist_sections, watchlists,
    },
    transactions::TransactionKind,
};

pub(crate) const USER_1: i64 = 1;
pub(crate) const USER_2: i64 = 2;

pub(crate) async fn portfolio(
    db: &DatabaseConnection,
    user_id: i64,
    name: &str,
    is_default: bool,
) -> portfolios::Model {
    portfolios::ActiveModel {
        user_id: Set(user_id),
        name: Set(name.to_string()),
        is_default: Set(is_default),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("portfolio")
}

pub(crate) async fn instrument(db: &DatabaseConnection, symbol: &str) -> instruments::Model {
    instrument_in(db, symbol, "USD").await
}

pub(crate) async fn instrument_in(
    db: &DatabaseConnection,
    symbol: &str,
    currency: &str,
) -> instruments::Model {
    instruments::ActiveModel {
        symbol: Set(symbol.to_string()),
        name: Set(symbol.to_string()),
        currency: Set(currency.to_string()),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("instrument")
}

pub(crate) async fn position(
    db: &DatabaseConnection,
    portfolio_id: i64,
    instrument_id: i64,
) -> positions::Model {
    positions::ActiveModel {
        portfolio_id: Set(portfolio_id),
        instrument_id: Set(instrument_id),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("position")
}

pub(crate) async fn transaction(
    db: &DatabaseConnection,
    position_id: i64,
    kind: TransactionKind,
    quantity: &str,
    day: u32,
) -> transactions::Model {
    transactions::ActiveModel {
        position_id: Set(position_id),
        kind: Set(kind.to_value()),
        quantity: Set(quantity.parse::<Decimal>().unwrap()),
        unit_price: Set(Decimal::ONE_HUNDRED),
        executed_at: Set(NaiveDate::from_ymd_opt(2026, 1, day).unwrap()),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("transaction")
}

/// Daily snapshot of `portfolio_id` (P&L is `value - invested`).
pub(crate) async fn snapshot(
    db: &DatabaseConnection,
    portfolio_id: i64,
    captured_on: NaiveDate,
    invested: &str,
    value: &str,
) -> portfolio_snapshots::Model {
    let invested = invested.parse::<Decimal>().unwrap();
    let value = value.parse::<Decimal>().unwrap();
    portfolio_snapshots::ActiveModel {
        portfolio_id: Set(portfolio_id),
        captured_on: Set(captured_on),
        invested_eur: Set(invested),
        current_value_eur: Set(value),
        pnl_eur: Set(value - invested),
        position_count: Set(1),
        quote_error: Set(false),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("snapshot")
}

pub(crate) async fn watchlist(
    db: &DatabaseConnection,
    user_id: i64,
    name: &str,
    position: i64,
) -> watchlists::Model {
    watchlists::ActiveModel {
        user_id: Set(user_id),
        name: Set(name.to_string()),
        position: Set(position),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("watchlist")
}

pub(crate) async fn section(
    db: &DatabaseConnection,
    watchlist_id: i64,
    name: &str,
    position: i64,
    is_default: bool,
) -> watchlist_sections::Model {
    watchlist_sections::ActiveModel {
        watchlist_id: Set(watchlist_id),
        name: Set(name.to_string()),
        position: Set(position),
        is_default: Set(is_default),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("section")
}

pub(crate) async fn item(
    db: &DatabaseConnection,
    section: &watchlist_sections::Model,
    instrument_id: i64,
    position: i64,
) -> watchlist_items::Model {
    watchlist_items::ActiveModel {
        watchlist_id: Set(section.watchlist_id),
        watchlist_section_id: Set(section.id),
        instrument_id: Set(instrument_id),
        position: Set(position),
        ..Default::default()
    }
    .insert(db)
    .await
    .expect("item")
}
