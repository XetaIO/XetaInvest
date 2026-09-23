use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use xeta_invest::models::watchlists::Entity;

#[tokio::test]
#[serial]
async fn next_position_and_compaction_are_per_user() {
    let ctx = boot().await;
    assert_eq!(Entity::next_position(&ctx.db, USER_1).await.unwrap(), 0);

    fixtures::watchlist(&ctx.db, USER_1, "A", 0).await;
    let b = fixtures::watchlist(&ctx.db, USER_1, "B", 1).await;
    fixtures::watchlist(&ctx.db, USER_1, "C", 2).await;
    fixtures::watchlist(&ctx.db, USER_2, "Other", 5).await;
    assert_eq!(Entity::next_position(&ctx.db, USER_1).await.unwrap(), 3);

    Entity::compact_after(&ctx.db, USER_1, b.position)
        .await
        .unwrap();
    let positions: Vec<(String, i64)> = Entity::list_for_user(&ctx.db, USER_1)
        .await
        .unwrap()
        .into_iter()
        .map(|row| (row.name, row.position))
        .collect();
    // B itself is not deleted in this test: only the rows after it shift.
    assert_eq!(
        positions,
        [
            ("A".to_string(), 0),
            ("B".to_string(), 1),
            ("C".to_string(), 1)
        ]
    );

    let other = Entity::list_for_user(&ctx.db, USER_2).await.unwrap();
    assert_eq!(other[0].position, 5, "other users are untouched");
}

#[tokio::test]
#[serial]
async fn ensure_watchlist_owner_is_not_found_for_other_users() {
    let ctx = boot().await;
    let list = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;

    assert!(
        Entity::ensure_watchlist_owner(&ctx.db, USER_1, list.id)
            .await
            .is_ok()
    );
    assert!(matches!(
        Entity::ensure_watchlist_owner(&ctx.db, USER_2, list.id).await,
        Err(loco_rs::Error::NotFound)
    ));
}
