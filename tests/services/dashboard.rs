use loco_rs::testing::prelude::*;
use rust_decimal::Decimal;
use serial_test::serial;
use xeta_invest::app::App;
use xeta_invest::models::transactions::TransactionKind;

use crate::fixtures::{self, USER_1};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

fn dec(value: &str) -> rust_decimal::Decimal {
    value.parse().unwrap()
}

use xeta_invest::services::dashboard;

#[tokio::test]
#[serial]
async fn without_an_explicit_id_the_default_portfolio_is_active() {
    let ctx = boot().await;
    fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;

    let page = dashboard::build(&ctx, USER_1, None, false).await.unwrap();
    assert_eq!(page.portfolios.len(), 2);
    assert_eq!(page.active.unwrap().portfolio.id, main.id);
}

#[tokio::test]
#[serial]
async fn kpis_are_exact_and_converted_to_eur() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let position = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "0.3", 1).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Sell, "0.1", 2).await;

    let active = dashboard::build(&ctx, USER_1, Some(portfolio.id), false)
        .await
        .unwrap()
        .active
        .unwrap();
    assert!(active.quote_error.is_none());
    let kpis = &active.kpis.positions[0];
    // Mock: AAPL at 200 USD (previous close 199), USD→EUR 0.92, lots at 100.
    assert_eq!(kpis.quantity, dec("0.2"));
    assert_eq!(kpis.invested, dec("20"));
    assert_eq!(kpis.current_value, dec("40"));
    assert_eq!(kpis.realized_pnl, Decimal::ZERO);
    assert_eq!(kpis.fx_rate, dec("0.92"));
    assert_eq!(active.kpis.total_invested, dec("18.4"));
    assert_eq!(active.kpis.current_value, dec("36.8"));
    assert_eq!(active.kpis.pnl_pct, dec("100"));
}

#[tokio::test]
#[serial]
async fn provider_failures_degrade_into_quote_error() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    // The mock fails on the `FAIL` ticker (quotes) and the `FAIL` currency (FX).
    let broken = fixtures::instrument_in(&ctx.db, "FAIL", "FAIL").await;
    let position = fixtures::position(&ctx.db, portfolio.id, broken.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1", 1).await;

    let active = dashboard::build(&ctx, USER_1, None, false)
        .await
        .unwrap()
        .active
        .unwrap();
    assert_eq!(
        active.quote_error.as_deref(),
        Some("Market data is temporarily unavailable.")
    );
    let kpis = &active.kpis.positions[0];
    assert_eq!(kpis.current_value, Decimal::ZERO);
    assert_eq!(kpis.fx_rate, Decimal::ONE, "FX falls back to 1");
}
