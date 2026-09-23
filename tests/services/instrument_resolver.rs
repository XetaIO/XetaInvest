use loco_rs::testing::prelude::*;
use sea_orm::{EntityTrait, PaginatorTrait};
use serial_test::serial;
use xeta_invest::{app::App, models::_entities::instruments, services::instrument_resolver};

#[tokio::test]
#[serial]
async fn resolve_creates_then_reuses_the_same_row() {
    let boot = boot_test::<App>().await.unwrap();
    let ctx = &boot.app_context;

    let first = instrument_resolver::resolve(ctx, " aapl ")
        .await
        .unwrap()
        .expect("AAPL is in the mock search results");
    let second = instrument_resolver::resolve(ctx, "AAPL")
        .await
        .unwrap()
        .expect("second resolve should hit the DB");

    assert_eq!(first.id, second.id);
    assert_eq!(first.symbol, "AAPL");
    assert_eq!(first.name, "Apple Inc.");
    assert_eq!(first.exchange.as_deref(), Some("NMS"));
    assert_eq!(first.quote_type.as_deref(), Some("equity"));
    assert_eq!(first.currency, "USD");
    assert!(first.last_synced_at.is_some());

    let count = instruments::Entity::find().count(&ctx.db).await.unwrap();
    assert_eq!(count, 1, "the same ticker must not insert twice");
}

#[tokio::test]
#[serial]
async fn resolve_uses_quote_when_search_has_no_exact_match() {
    let boot = boot_test::<App>().await.unwrap();
    let ctx = &boot.app_context;

    let instrument = instrument_resolver::resolve(ctx, "MSFT")
        .await
        .unwrap()
        .expect("MSFT has a mock quote even though search only returns AAPL/AAP");

    assert_eq!(instrument.symbol, "MSFT");
    assert_eq!(instrument.name, "MSFT Inc");
    assert_eq!(instrument.currency, "USD");
}

#[tokio::test]
#[serial]
async fn resolve_unknown_symbol_returns_none() {
    let boot = boot_test::<App>().await.unwrap();
    let found = instrument_resolver::resolve(&boot.app_context, "MISSING")
        .await
        .unwrap();
    assert!(found.is_none());

    let count = instruments::Entity::find()
        .count(&boot.app_context.db)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
#[serial]
async fn resolve_blank_symbol_returns_none() {
    let boot = boot_test::<App>().await.unwrap();
    let found = instrument_resolver::resolve(&boot.app_context, "   ")
        .await
        .unwrap();
    assert!(found.is_none());
}
