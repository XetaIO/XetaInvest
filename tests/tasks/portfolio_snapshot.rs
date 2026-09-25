use chrono::NaiveDate;
use loco_rs::{app::AppContext, boot::run_task, task, testing::prelude::*};
use rust_decimal::Decimal;
use serial_test::serial;
use xeta_invest::{
    app::App,
    models::{
        portfolio_snapshots::{Entity, Model},
        transactions::TransactionKind,
    },
};

use crate::fixtures::{self, USER_1, USER_2};

// Mock market data: AAPL / MSFT at 200 USD, USD→EUR 0.92, `FAIL` makes the provider error.

const DAY: &str = "2026-09-24";

async fn boot() -> AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

/// Runs `portfolio:snapshot` with `key:value` arguments.
async fn run(ctx: &AppContext, args: &[(&str, &str)]) -> loco_rs::Result<()> {
    let vars = task::Vars::from_cli_args(
        args.iter()
            .map(|(key, value)| ((*key).to_string(), (*value).to_string()))
            .collect(),
    );
    run_task::<App>(ctx, Some(&"portfolio:snapshot".to_string()), &vars).await
}

/// Runs the task on [`DAY`], for every portfolio or only `portfolio_id`.
async fn capture(ctx: &AppContext, portfolio_id: Option<i64>) -> loco_rs::Result<()> {
    match portfolio_id {
        Some(id) => run(ctx, &[("date", DAY), ("portfolio", &id.to_string())]).await,
        None => run(ctx, &[("date", DAY)]).await,
    }
}

fn dec(value: &str) -> Decimal {
    value.parse().unwrap()
}

fn day() -> NaiveDate {
    NaiveDate::from_ymd_opt(2026, 9, 24).unwrap()
}

/// Opens a position on a new `symbol` instrument with one buy of `quantity` at 100 USD.
async fn holding(ctx: &AppContext, portfolio_id: i64, symbol: &str, quantity: &str) -> i64 {
    let instrument = fixtures::instrument(&ctx.db, symbol).await;
    let position = fixtures::position(&ctx.db, portfolio_id, instrument.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, quantity, 1).await;
    position.id
}

async fn snapshots(ctx: &AppContext, portfolio_ids: &[i64]) -> Vec<Model> {
    Entity::list_since(&ctx.db, portfolio_ids, day())
        .await
        .unwrap()
}

fn portfolio_ids(rows: &[Model]) -> Vec<i64> {
    rows.iter().map(|row| row.portfolio_id).collect()
}

#[tokio::test]
#[serial]
async fn rejects_an_invalid_date() {
    let ctx = boot().await;

    let err = run(&ctx, &[("date", "2026-13-40")]).await.unwrap_err();

    assert_eq!(err.to_string(), "Invalid date value: 2026-13-40");
}

#[tokio::test]
#[serial]
async fn rejects_an_unknown_portfolio() {
    let ctx = boot().await;

    let err = run(&ctx, &[("portfolio", "999999")]).await.unwrap_err();

    assert_eq!(err.to_string(), "Portfolio #999999 not found.");
}

#[tokio::test]
#[serial]
async fn captures_the_requested_day() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let position = fixtures::position(&ctx.db, main.id, aapl.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1", 1).await;
    let day = NaiveDate::from_ymd_opt(2026, 9, 20).unwrap();

    run(
        &ctx,
        &[
            ("date", "2026-09-20"),
            ("portfolio", &main.id.to_string()),
            ("force", "true"),
        ],
    )
    .await
    .unwrap();

    let rows = Entity::list_since(&ctx.db, &[main.id], day).await.unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].captured_on, day);
}

#[tokio::test]
#[serial]
async fn captures_every_portfolio_with_positions_and_skips_empty_ones() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let empty = fixtures::portfolio(&ctx.db, USER_1, "Empty", false).await;
    let sold = fixtures::portfolio(&ctx.db, USER_2, "Sold", true).await;
    holding(&ctx, main.id, "AAPL", "2").await;
    let sold_position = holding(&ctx, sold.id, "MSFT", "1").await;
    fixtures::transaction(&ctx.db, sold_position, TransactionKind::Sell, "1", 2).await;

    capture(&ctx, None).await.unwrap();

    let rows = snapshots(&ctx, &[main.id, empty.id, sold.id]).await;
    assert_eq!(portfolio_ids(&rows), [main.id, sold.id]);
    let main_row = &rows[0];
    assert_eq!(main_row.captured_on, day());
    // 2 × 100 USD invested, 2 × 200 USD value, × 0.92.
    assert_eq!(main_row.invested_eur, dec("184"));
    assert_eq!(main_row.current_value_eur, dec("368"));
    assert_eq!(main_row.pnl_eur, dec("184"));
    assert_eq!(main_row.position_count, 1);
    assert!(!main_row.quote_error);
    assert_eq!(
        rows[1].position_count, 0,
        "a fully sold position is not counted"
    );
}

#[tokio::test]
#[serial]
async fn running_twice_the_same_day_keeps_one_row() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    holding(&ctx, main.id, "AAPL", "1").await;

    capture(&ctx, None).await.unwrap();
    capture(&ctx, None).await.unwrap();

    assert_eq!(snapshots(&ctx, &[main.id]).await.len(), 1);
}

#[tokio::test]
#[serial]
async fn targeted_run_only_captures_that_portfolio() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    holding(&ctx, main.id, "AAPL", "1").await;
    holding(&ctx, side.id, "MSFT", "1").await;

    capture(&ctx, Some(side.id)).await.unwrap();

    assert_eq!(
        portfolio_ids(&snapshots(&ctx, &[main.id, side.id]).await),
        [side.id]
    );
}

#[tokio::test]
#[serial]
async fn targeted_run_on_an_empty_portfolio_succeeds_without_a_row() {
    let ctx = boot().await;
    let empty = fixtures::portfolio(&ctx.db, USER_1, "Empty", true).await;

    capture(&ctx, Some(empty.id)).await.unwrap();

    assert!(snapshots(&ctx, &[empty.id]).await.is_empty());
}

#[tokio::test]
#[serial]
async fn unavailable_market_data_writes_nothing_and_fails() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    holding(&ctx, main.id, "FAIL", "1").await;

    let err = capture(&ctx, Some(main.id)).await.unwrap_err();

    assert_eq!(
        err.to_string(),
        format!(
            "Snapshot not saved for portfolio #{}: market data is unavailable.",
            main.id
        )
    );
    assert!(snapshots(&ctx, &[main.id]).await.is_empty());
}

#[tokio::test]
#[serial]
async fn one_failing_portfolio_does_not_block_the_others() {
    let ctx = boot().await;
    let broken = fixtures::portfolio(&ctx.db, USER_1, "Broken", true).await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", false).await;
    holding(&ctx, broken.id, "FAIL", "1").await;
    holding(&ctx, main.id, "AAPL", "1").await;

    let err = capture(&ctx, None).await.unwrap_err();

    assert_eq!(
        err.to_string(),
        "1 portfolio snapshot(s) failed on 2026-09-24 (1 captured, 0 skipped)."
    );
    assert_eq!(
        portfolio_ids(&snapshots(&ctx, &[broken.id, main.id]).await),
        [main.id]
    );
}
