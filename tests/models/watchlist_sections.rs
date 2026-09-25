use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use xeta_invest::models::watchlist_sections::Entity;

#[tokio::test]
#[serial]
async fn default_ids_are_loaded_for_several_watchlists() {
    let ctx = boot().await;
    let tech = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    let energy = fixtures::watchlist(&ctx.db, USER_1, "Energy", 1).await;
    let empty = fixtures::watchlist(&ctx.db, USER_1, "Empty", 2).await;
    let tech_default = fixtures::section(&ctx.db, tech.id, "General", 0, true).await;
    fixtures::section(&ctx.db, tech.id, "Chips", 1, false).await;
    let energy_default = fixtures::section(&ctx.db, energy.id, "General", 0, true).await;

    let defaults = Entity::default_ids_by_watchlist(&ctx.db, &[tech.id, energy.id, empty.id])
        .await
        .unwrap();
    assert_eq!(defaults.len(), 2);
    assert_eq!(defaults[&tech.id], tech_default.id);
    assert_eq!(defaults[&energy.id], energy_default.id);
    assert!(
        Entity::find_default(&ctx.db, empty.id)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
#[serial]
async fn sections_are_appended_and_compacted() {
    let ctx = boot().await;
    let list = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    assert_eq!(Entity::next_position(&ctx.db, list.id).await.unwrap(), 0);
    fixtures::section(&ctx.db, list.id, "General", 0, true).await;
    let chips = fixtures::section(&ctx.db, list.id, "Chips", 1, false).await;
    fixtures::section(&ctx.db, list.id, "Cloud", 2, false).await;
    assert_eq!(Entity::next_position(&ctx.db, list.id).await.unwrap(), 3);

    Entity::compact_after(&ctx.db, list.id, chips.position)
        .await
        .unwrap();
    let rows = Entity::list_for_watchlist(&ctx.db, list.id).await.unwrap();
    let cloud = rows.iter().find(|row| row.name == "Cloud").unwrap();
    assert_eq!(cloud.position, 1);
}

#[tokio::test]
#[serial]
async fn name_taken_is_scoped_to_the_watchlist() {
    let ctx = boot().await;
    let tech = fixtures::watchlist(&ctx.db, USER_1, "Tech", 0).await;
    let energy = fixtures::watchlist(&ctx.db, USER_1, "Energy", 1).await;
    let section = fixtures::section(&ctx.db, tech.id, "General", 0, true).await;

    assert!(
        Entity::name_taken(&ctx.db, tech.id, "General", None)
            .await
            .unwrap()
    );
    assert!(
        !Entity::name_taken(&ctx.db, tech.id, "General", Some(section.id))
            .await
            .unwrap()
    );
    assert!(
        !Entity::name_taken(&ctx.db, energy.id, "General", None)
            .await
            .unwrap()
    );
}
