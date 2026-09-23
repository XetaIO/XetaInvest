use loco_rs::testing::prelude::*;
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

use xeta_invest::models::watchlists::MAX_ITEMS;
use xeta_invest::services::watchlist_page;

#[tokio::test]
#[serial]
async fn active_watchlist_falls_back_to_the_first_owned_one() {
    let ctx = boot().await;
    let first = fixtures::watchlist(&ctx.db, USER_1, "First", 0).await;
    let second = fixtures::watchlist(&ctx.db, USER_1, "Second", 1).await;
    let foreign = fixtures::watchlist(&ctx.db, fixtures::USER_2, "Foreign", 0).await;

    let page = watchlist_page::build(&ctx, USER_1, Some(second.id))
        .await
        .unwrap();
    assert_eq!(page.active_watchlist_id, Some(second.id));
    let page = watchlist_page::build(&ctx, USER_1, Some(foreign.id))
        .await
        .unwrap();
    assert_eq!(page.active_watchlist_id, Some(first.id));
    assert_eq!(page.watchlists.len(), 2);
    assert_eq!(page.limits.max_items, MAX_ITEMS);
}

#[tokio::test]
#[serial]
async fn sections_items_and_open_positions_are_assembled() {
    let ctx = boot().await;
    let list = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    let general = fixtures::section(&ctx.db, list.id, "General", 0, true).await;
    let chips = fixtures::section(&ctx.db, list.id, "Chips", 1, false).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let msft = fixtures::instrument(&ctx.db, "MSFT").await;
    let tsla = fixtures::instrument(&ctx.db, "TSLA").await;
    fixtures::item(&ctx.db, &general, aapl.id, 0).await;
    fixtures::item(&ctx.db, &chips, msft.id, 0).await;

    // AAPL held in two portfolios, MSFT fully sold, TSLA held but not listed.
    let core = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    for portfolio in [&core, &side] {
        let position = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;
        fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1.5", 1).await;
    }
    let sold = fixtures::position(&ctx.db, core.id, msft.id).await;
    fixtures::transaction(&ctx.db, sold.id, TransactionKind::Buy, "1", 1).await;
    fixtures::transaction(&ctx.db, sold.id, TransactionKind::Sell, "1", 2).await;
    let unlisted = fixtures::position(&ctx.db, core.id, tsla.id).await;
    fixtures::transaction(&ctx.db, unlisted.id, TransactionKind::Buy, "1", 1).await;

    let page = watchlist_page::build(&ctx, USER_1, None).await.unwrap();
    let sections = &page.watchlists[0].sections;
    assert_eq!(sections.len(), 2);
    assert_eq!(sections[0].items[0].instrument.symbol, "AAPL");
    assert_eq!(sections[1].items[0].instrument.symbol, "MSFT");

    assert_eq!(
        page.positions.len(),
        1,
        "only open positions on listed tickers"
    );
    let aapl_position = &page.positions["AAPL"];
    assert_eq!(aapl_position.quantity, dec("3"));
    assert_eq!(aapl_position.avg_price, dec("100"));
}
