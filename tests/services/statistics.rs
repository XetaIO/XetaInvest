use chrono::{Days, NaiveDate};
use loco_rs::Error;
use loco_rs::testing::prelude::*;
use rust_decimal::Decimal;
use serial_test::serial;
use xeta_invest::app::App;
use xeta_invest::dtos::statistics::StatisticsScope;
use xeta_invest::models::transactions::TransactionKind;
use xeta_invest::services::statistics::{self, Scope};

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

fn dec(value: &str) -> Decimal {
    value.parse().unwrap()
}

fn today() -> NaiveDate {
    chrono::Utc::now().date_naive()
}

fn days_ago(days: u64) -> NaiveDate {
    today().checked_sub_days(Days::new(days)).unwrap()
}

/// Opens a position on `symbol` with one buy of `quantity` at 100 (native).
async fn holding(
    ctx: &loco_rs::app::AppContext,
    portfolio_id: i64,
    symbol: &str,
    quantity: &str,
) -> i64 {
    let instrument = match xeta_invest::models::instruments::Entity::find_by_symbol(&ctx.db, symbol)
        .await
        .unwrap()
    {
        Some(instrument) => instrument,
        None => fixtures::instrument(&ctx.db, symbol).await,
    };
    let position = fixtures::position(&ctx.db, portfolio_id, instrument.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, quantity, 1).await;
    position.id
}

// Mock market data: AAPL / MSFT at 200 USD (previous close 199), USD→EUR 0.92,
// unknown symbols have no quote (price 0), `FAIL` makes the provider error.

#[tokio::test]
#[serial]
async fn all_scope_aggregates_every_portfolio() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    let empty = fixtures::portfolio(&ctx.db, USER_1, "Empty", false).await;
    holding(&ctx, main.id, "AAPL", "1").await;
    holding(&ctx, side.id, "MSFT", "2").await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    assert_eq!(stats.scope, StatisticsScope::All);
    assert_eq!(stats.portfolios.len(), 3);
    assert!(stats.quote_error.is_none());
    let totals = &stats.totals;
    assert_eq!(totals.invested_eur, dec("276"));
    assert_eq!(totals.current_value_eur, dec("552"));
    assert_eq!(totals.pnl_eur, dec("276"));
    assert_eq!(totals.pnl_pct, dec("100"));
    // Previous close 199: 3 × 199 × 0.92 = 549.24.
    assert_eq!(totals.daily_change_eur, dec("2.76"));
    assert_eq!(
        (
            totals.position_count,
            totals.instrument_count,
            totals.portfolio_count
        ),
        (2, 2, 3)
    );
    let by_portfolio: Vec<(i64, Decimal)> = stats
        .allocations
        .by_portfolio
        .iter()
        .map(|row| (row.portfolio_id, row.value_eur))
        .collect();
    assert_eq!(
        by_portfolio,
        [
            (side.id, dec("368")),
            (main.id, dec("184")),
            (empty.id, Decimal::ZERO)
        ]
    );
    assert_eq!(stats.allocations.by_instrument[0].symbol, "MSFT");
    assert_eq!(stats.allocations.by_currency[0].currency, "USD");
    assert_eq!(stats.allocations.by_currency[0].percent, dec("100"));
    assert_eq!(stats.allocations.by_type[0].asset_type, "stock");
}

#[tokio::test]
#[serial]
async fn portfolio_scope_only_covers_that_portfolio() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    holding(&ctx, main.id, "AAPL", "1").await;
    holding(&ctx, side.id, "MSFT", "2").await;

    let stats = statistics::build(&ctx, USER_1, Scope::Portfolio(main.id), false)
        .await
        .unwrap();

    assert_eq!(
        stats.scope,
        StatisticsScope::Portfolio {
            id: main.id,
            name: "Main".to_string()
        }
    );
    assert_eq!(stats.portfolios.len(), 2);
    assert_eq!(stats.totals.position_count, 1);
    assert_eq!(stats.totals.portfolio_count, 1);
    assert_eq!(stats.allocations.by_instrument.len(), 1);
    assert_eq!(stats.allocations.by_instrument[0].symbol, "AAPL");
    assert!(stats.allocations.by_portfolio.is_empty());
}

#[tokio::test]
#[serial]
async fn another_users_portfolio_is_not_found() {
    let ctx = boot().await;
    let foreign = fixtures::portfolio(&ctx.db, USER_2, "Theirs", true).await;

    let result = statistics::build(&ctx, USER_1, Scope::Portfolio(foreign.id), false).await;
    assert!(matches!(result, Err(Error::NotFound)));
}

#[tokio::test]
#[serial]
async fn merges_symbols_and_ignores_sold_positions() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    holding(&ctx, main.id, "AAPL", "1").await;
    holding(&ctx, side.id, "AAPL", "1").await;
    let sold = holding(&ctx, side.id, "MSFT", "1").await;
    fixtures::transaction(&ctx.db, sold, TransactionKind::Sell, "1", 2).await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    assert_eq!(stats.totals.position_count, 2);
    assert_eq!(stats.totals.instrument_count, 1);
    let aapl = &stats.allocations.by_instrument[0];
    assert_eq!(aapl.symbol, "AAPL");
    assert_eq!(aapl.value_eur, dec("368"));
    assert_eq!(aapl.percent, dec("100"));
}

#[tokio::test]
#[serial]
async fn movers_split_gainers_and_losers() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    holding(&ctx, main.id, "AAPL", "1").await;
    holding(&ctx, main.id, "ZZZ", "1").await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    let gainers: Vec<&str> = stats
        .performance
        .top_gainers
        .iter()
        .map(|r| r.symbol.as_str())
        .collect();
    let losers: Vec<&str> = stats
        .performance
        .top_losers
        .iter()
        .map(|r| r.symbol.as_str())
        .collect();
    assert_eq!(gainers, ["AAPL"]);
    assert_eq!(losers, ["ZZZ"]);
    assert_eq!(stats.performance.top_losers[0].pnl_pct, dec("-100"));
}

#[tokio::test]
#[serial]
async fn history_without_snapshots_is_the_live_point() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    holding(&ctx, main.id, "AAPL", "1").await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    assert_eq!(stats.history.len(), 1);
    assert_eq!(stats.history[0].date, today().to_string());
    assert_eq!(stats.history[0].value_eur, dec("184"));
    assert_eq!(stats.history[0].invested_eur, dec("92"));
    assert_eq!(stats.history[0].pnl_eur, dec("92"));
}

#[tokio::test]
#[serial]
async fn all_scope_history_sums_own_snapshots_per_day() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    let foreign = fixtures::portfolio(&ctx.db, USER_2, "Theirs", true).await;
    fixtures::snapshot(&ctx.db, main.id, days_ago(10), "1000", "1100").await;
    fixtures::snapshot(&ctx.db, side.id, days_ago(10), "500", "600").await;
    fixtures::snapshot(&ctx.db, foreign.id, days_ago(10), "9999", "9999").await;
    fixtures::snapshot(&ctx.db, main.id, days_ago(400), "1", "1").await;
    fixtures::snapshot(&ctx.db, main.id, today(), "1", "1").await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    assert_eq!(stats.history.len(), 2);
    assert_eq!(stats.history[0].date, days_ago(10).to_string());
    assert_eq!(stats.history[0].value_eur, dec("1700"));
    assert_eq!(stats.history[0].invested_eur, dec("1500"));
    assert_eq!(stats.history[0].pnl_eur, dec("200"));
    assert_eq!(stats.history[1].date, today().to_string());
    assert_eq!(stats.history[1].value_eur, Decimal::ZERO);
}

#[tokio::test]
#[serial]
async fn portfolio_scope_history_excludes_other_portfolios() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    fixtures::snapshot(&ctx.db, main.id, days_ago(2), "1000", "1100").await;
    fixtures::snapshot(&ctx.db, main.id, days_ago(1), "1000", "1200").await;
    fixtures::snapshot(&ctx.db, side.id, days_ago(1), "500", "600").await;

    let stats = statistics::build(&ctx, USER_1, Scope::Portfolio(main.id), false)
        .await
        .unwrap();

    let values: Vec<Decimal> = stats.history.iter().map(|p| p.value_eur).collect();
    assert_eq!(values, [dec("1100"), dec("1200"), Decimal::ZERO]);
}

#[tokio::test]
#[serial]
async fn provider_failures_degrade_into_quote_error() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    let broken = fixtures::instrument_in(&ctx.db, "FAIL", "FAIL").await;
    let position = fixtures::position(&ctx.db, main.id, broken.id).await;
    fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1", 1).await;

    let stats = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();

    assert!(stats.quote_error.is_some());
    assert_eq!(stats.totals.position_count, 1);
}

#[tokio::test]
#[serial]
async fn payload_is_cached_until_refresh() {
    let ctx = boot().await;
    let main = fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    holding(&ctx, main.id, "AAPL", "1").await;

    let first = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();
    holding(&ctx, main.id, "MSFT", "1").await;
    let cached = statistics::build(&ctx, USER_1, Scope::All, false)
        .await
        .unwrap();
    let refreshed = statistics::build(&ctx, USER_1, Scope::All, true)
        .await
        .unwrap();

    assert_eq!(first.totals.position_count, 1);
    assert_eq!(cached.totals.position_count, 1);
    assert_eq!(cached.generated_at, first.generated_at);
    assert_eq!(refreshed.totals.position_count, 2);
}
