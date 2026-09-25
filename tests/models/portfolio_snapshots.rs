use chrono::NaiveDate;
use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

fn day(month: u32, day: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, month, day).unwrap()
}

use rust_decimal::Decimal;
use xeta_invest::models::portfolio_snapshots::{Entity, SnapshotValues};

fn values(invested: &str, value: &str, position_count: i16) -> SnapshotValues {
    let invested = invested.parse::<Decimal>().unwrap();
    let value = value.parse::<Decimal>().unwrap();
    SnapshotValues {
        invested_eur: invested,
        current_value_eur: value,
        pnl_eur: value - invested,
        position_count,
    }
}

#[tokio::test]
#[serial]
async fn upsert_for_day_inserts_then_overwrites_the_same_row() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let other_day = fixtures::snapshot(&ctx.db, main.id, day(5, 20), "1", "1").await;

    let first = Entity::upsert_for_day(&ctx.db, main.id, day(5, 21), values("100", "110", 2))
        .await
        .unwrap();
    let second = Entity::upsert_for_day(&ctx.db, main.id, day(5, 21), values("100", "90", 1))
        .await
        .unwrap();

    assert_eq!(second.id, first.id);
    assert_eq!(
        (
            second.current_value_eur,
            second.pnl_eur,
            second.position_count
        ),
        (Decimal::from(90), Decimal::from(-10), 1)
    );
    assert!(!second.quote_error);
    let rows = Entity::list_since(&ctx.db, &[main.id], day(1, 1))
        .await
        .unwrap();
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0], other_day, "other days are left untouched");
}

#[tokio::test]
#[serial]
async fn list_since_filters_portfolios_and_dates_oldest_first() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    let other = fixtures::portfolio(&ctx.db, USER_1, "Other", false).await;
    fixtures::snapshot(&ctx.db, main.id, day(5, 21), "100", "110").await;
    fixtures::snapshot(&ctx.db, side.id, day(5, 20), "50", "40").await;
    fixtures::snapshot(&ctx.db, main.id, day(1, 1), "10", "10").await;
    fixtures::snapshot(&ctx.db, other.id, day(5, 22), "1", "1").await;

    let rows = Entity::list_since(&ctx.db, &[main.id, side.id], day(5, 1))
        .await
        .unwrap();
    let keys: Vec<(i64, NaiveDate)> = rows
        .iter()
        .map(|row| (row.portfolio_id, row.captured_on))
        .collect();
    assert_eq!(keys, [(side.id, day(5, 20)), (main.id, day(5, 21))]);
}

#[tokio::test]
#[serial]
async fn list_since_without_portfolios_is_empty() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    fixtures::snapshot(&ctx.db, main.id, day(5, 21), "100", "110").await;

    assert!(
        Entity::list_since(&ctx.db, &[], day(1, 1))
            .await
            .unwrap()
            .is_empty()
    );
}

#[tokio::test]
#[serial]
async fn schema_allows_one_snapshot_per_portfolio_and_day() {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set};
    use xeta_invest::models::_entities::portfolio_snapshots::ActiveModel;

    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    fixtures::snapshot(&ctx.db, main.id, day(5, 21), "100", "110").await;

    let duplicate = ActiveModel {
        portfolio_id: Set(main.id),
        captured_on: Set(day(5, 21)),
        invested_eur: Set(rust_decimal::Decimal::ONE),
        current_value_eur: Set(rust_decimal::Decimal::ONE),
        pnl_eur: Set(rust_decimal::Decimal::ZERO),
        ..Default::default()
    }
    .insert(&ctx.db)
    .await;
    assert!(
        duplicate.is_err(),
        "unique (portfolio_id, captured_on) must reject a second snapshot"
    );
}
