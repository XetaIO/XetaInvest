use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use xeta_invest::models::watchlist_items::Entity;

#[tokio::test]
#[serial]
async fn items_are_appended_counted_and_compacted() {
    let ctx = boot().await;
    let list = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    let section = fixtures::section(&ctx.db, list.id, "General", 0, true).await;
    assert_eq!(Entity::next_position(&ctx.db, section.id).await.unwrap(), 0);

    let mut items = Vec::new();
    for (position, symbol) in [(0, "AAPL"), (1, "MSFT"), (2, "TSLA")] {
        let instrument = fixtures::instrument(&ctx.db, symbol).await;
        items.push(fixtures::item(&ctx.db, &section, instrument.id, position).await);
    }
    assert_eq!(Entity::next_position(&ctx.db, section.id).await.unwrap(), 3);
    assert_eq!(
        Entity::count_for_watchlist(&ctx.db, list.id).await.unwrap(),
        3
    );

    Entity::compact_after(&ctx.db, section.id, items[0].position)
        .await
        .unwrap();
    let positions: Vec<i64> = Entity::list_for_section(&ctx.db, section.id)
        .await
        .unwrap()
        .iter()
        .map(|row| row.position)
        .collect();
    // The first row is not deleted in this test: only the rows after it shift.
    assert_eq!(positions, [0, 0, 1]);
}

#[tokio::test]
#[serial]
async fn symbols_for_user_only_lists_the_users_tickers() {
    let ctx = boot().await;
    let mine = fixtures::watchlist(&ctx.db, USER_1, "Mine", 0).await;
    let theirs = fixtures::watchlist(&ctx.db, USER_2, "Theirs", 0).await;
    let my_section = fixtures::section(&ctx.db, mine.id, "General", 0, true).await;
    let their_section = fixtures::section(&ctx.db, theirs.id, "General", 0, true).await;
    let aapl = fixtures::instrument(&ctx.db, "aapl").await;
    let msft = fixtures::instrument(&ctx.db, "MSFT").await;
    fixtures::item(&ctx.db, &my_section, aapl.id, 0).await;
    fixtures::item(&ctx.db, &their_section, msft.id, 0).await;

    assert_eq!(
        Entity::symbols_for_user(&ctx.db, USER_1).await.unwrap(),
        ["AAPL"]
    );
}

#[tokio::test]
#[serial]
async fn ensure_owner_is_not_found_for_other_users() {
    let ctx = boot().await;
    let list = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    let section = fixtures::section(&ctx.db, list.id, "General", 0, true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let item = fixtures::item(&ctx.db, &section, aapl.id, 0).await;

    assert!(Entity::ensure_owner(&ctx.db, USER_1, item.id).await.is_ok());
    assert!(matches!(
        Entity::ensure_owner(&ctx.db, USER_2, item.id).await,
        Err(loco_rs::Error::NotFound)
    ));
}
