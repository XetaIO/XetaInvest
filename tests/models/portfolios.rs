use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use crate::fixtures::{self, USER_1, USER_2};

async fn boot() -> loco_rs::app::AppContext {
    let boot = boot_test::<App>().await.expect("boot");
    seed::<App>(&boot.app_context).await.expect("seed");
    boot.app_context
}

use xeta_invest::models::portfolios::Entity;

#[tokio::test]
#[serial]
async fn list_for_user_puts_the_default_first_then_sorts_by_name() {
    let ctx = boot().await;
    fixtures::portfolio(&ctx.db, USER_1, "Beta", false).await;
    fixtures::portfolio(&ctx.db, USER_1, "Alpha", false).await;
    fixtures::portfolio(&ctx.db, USER_1, "Main", true).await;
    fixtures::portfolio(&ctx.db, USER_2, "Other", true).await;

    let names: Vec<String> = Entity::list_for_user(&ctx.db, USER_1)
        .await
        .unwrap()
        .into_iter()
        .map(|row| row.name)
        .collect();
    assert_eq!(names, ["Main", "Alpha", "Beta"]);
}

#[tokio::test]
#[serial]
async fn find_owned_hides_other_users_portfolios() {
    let ctx = boot().await;
    let mine = fixtures::portfolio(&ctx.db, USER_1, "Mine", true).await;

    assert!(
        Entity::find_owned(&ctx.db, USER_1, mine.id)
            .await
            .unwrap()
            .is_some()
    );
    assert!(
        Entity::find_owned(&ctx.db, USER_2, mine.id)
            .await
            .unwrap()
            .is_none()
    );
}

#[tokio::test]
#[serial]
async fn name_taken_is_scoped_to_the_user_and_ignores_the_edited_row() {
    let ctx = boot().await;
    let core = fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;

    assert!(
        Entity::name_taken(&ctx.db, USER_1, "Core", None)
            .await
            .unwrap()
    );
    assert!(
        !Entity::name_taken(&ctx.db, USER_1, "Core", Some(core.id))
            .await
            .unwrap()
    );
    assert!(
        !Entity::name_taken(&ctx.db, USER_2, "Core", None)
            .await
            .unwrap()
    );
}

#[tokio::test]
#[serial]
async fn default_flag_can_be_cleared_and_given_to_the_oldest() {
    let ctx = boot().await;
    let oldest = fixtures::portfolio(&ctx.db, USER_1, "Old", false).await;
    fixtures::portfolio(&ctx.db, USER_1, "New", true).await;
    let other = fixtures::portfolio(&ctx.db, USER_2, "Other", true).await;

    Entity::clear_default(&ctx.db, USER_1).await.unwrap();
    let rows = Entity::list_for_user(&ctx.db, USER_1).await.unwrap();
    assert!(rows.iter().all(|row| !row.is_default));

    Entity::promote_oldest_to_default(&ctx.db, USER_1)
        .await
        .unwrap();
    let rows = Entity::list_for_user(&ctx.db, USER_1).await.unwrap();
    assert_eq!(rows[0].id, oldest.id);
    assert!(rows[0].is_default);

    let untouched = Entity::find_owned(&ctx.db, USER_2, other.id)
        .await
        .unwrap()
        .unwrap();
    assert!(untouched.is_default, "other users keep their default");
}

#[tokio::test]
#[serial]
async fn the_schema_rejects_a_duplicate_name_for_the_same_user() {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set};
    use xeta_invest::models::portfolios::ActiveModel;

    let ctx = boot().await;
    fixtures::portfolio(&ctx.db, USER_1, "Core", true).await;
    fixtures::portfolio(&ctx.db, USER_2, "Core", true).await;

    let duplicate = ActiveModel {
        user_id: Set(USER_1),
        name: Set("Core".into()),
        is_default: Set(false),
        ..Default::default()
    };
    assert!(
        duplicate.insert(&ctx.db).await.is_err(),
        "unique (user_id, name)"
    );
}
