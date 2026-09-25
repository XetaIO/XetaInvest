use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::{app::App, models::instruments::Entity as InstrumentEntity};

#[tokio::test]
#[serial]
async fn find_by_symbol_is_none_when_empty() {
    let boot = boot_test::<App>().await.unwrap();
    let found = InstrumentEntity::find_by_symbol(&boot.app_context.db, "AAPL")
        .await
        .unwrap();
    assert!(found.is_none());
}
