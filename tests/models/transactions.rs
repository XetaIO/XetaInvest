use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use rust_decimal::Decimal;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, IntoActiveModel};
use xeta_invest::models::transactions::{Entity, TransactionKind};

#[tokio::test]
#[serial]
async fn lots_are_grouped_by_position_in_execution_order() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let msft = fixtures::instrument(&ctx.db, "MSFT").await;
    let a = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;
    let m = fixtures::position(&ctx.db, portfolio.id, msft.id).await;
    fixtures::transaction(&ctx.db, a.id, TransactionKind::Sell, "1", 20).await;
    fixtures::transaction(&ctx.db, a.id, TransactionKind::Buy, "2.5", 10).await;
    fixtures::transaction(&ctx.db, m.id, TransactionKind::Buy, "1", 5).await;

    let lots = Entity::lots_by_position(&ctx.db, &[a.id, m.id])
        .await
        .unwrap();
    let aapl_lots = &lots[&a.id];
    assert_eq!(aapl_lots.len(), 2);
    assert_eq!(
        aapl_lots[0].kind,
        TransactionKind::Buy,
        "earlier date first"
    );
    assert_eq!(aapl_lots[0].quantity, "2.5".parse::<Decimal>().unwrap());
    assert_eq!(lots[&m.id].len(), 1);
    assert_eq!(
        Entity::list_for_position(&ctx.db, a.id).await.unwrap(),
        *aapl_lots
    );
}

#[tokio::test]
#[serial]
async fn find_owned_hides_other_users_transactions() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let position = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;
    let row = fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1", 1).await;

    assert!(
        Entity::find_owned(&ctx.db, USER_1, row.id)
            .await
            .unwrap()
            .is_some()
    );
    assert!(
        Entity::find_owned(&ctx.db, USER_2, row.id)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
#[serial]
async fn the_schema_rejects_an_unknown_kind() {
    let ctx = boot().await;
    let portfolio = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    let aapl = fixtures::instrument(&ctx.db, "AAPL").await;
    let position = fixtures::position(&ctx.db, portfolio.id, aapl.id).await;
    let row = fixtures::transaction(&ctx.db, position.id, TransactionKind::Buy, "1", 1).await;

    let mut invalid = row.into_active_model();
    invalid.kind = Set("hold".to_string());
    assert!(
        invalid.update(&ctx.db).await.is_err(),
        "CHECK constraint on kind"
    );
}
