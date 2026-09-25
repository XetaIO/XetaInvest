use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use xeta_invest::models::positions::Entity;

#[tokio::test]
#[serial]
async fn find_owned_goes_through_the_portfolio_owner() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let position = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;

    assert!(
        Entity::find_owned(&ctx.db, USER_1, position.id)
            .await
            .unwrap()
            .is_some()
    );
    assert!(
        Entity::find_owned(&ctx.db, USER_2, position.id)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
#[serial]
async fn find_pair_and_batch_listing() {
    let ctx = boot().await;
    let core = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let side = fixtures::portfolio(&ctx.db, USER_1, "Side", false).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let msft = fixtures::instrument(&ctx.db, "MSFT").await;
    let first = fixtures::position(&ctx.db, core.id, aapl.id).await;
    fixtures::position(&ctx.db, side.id, msft.id).await;

    let found = Entity::find_pair(&ctx.db, core.id, aapl.id).await.unwrap();
    assert_eq!(found.map(|row| row.id), Some(first.id));
    assert!(
        Entity::find_pair(&ctx.db, core.id, msft.id)
            .await
            .unwrap()
            .is_none()
    );

    let both = Entity::list_for_portfolios(&ctx.db, &[core.id, side.id])
        .await
        .unwrap();
    assert_eq!(both.len(), 2);
    assert!(
        Entity::list_for_portfolios(&ctx.db, &[])
            .await
            .unwrap()
            .is_empty()
    );
}
