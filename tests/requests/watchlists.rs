use loco_rs::testing::prelude::*;
use sea_orm::{ActiveModelTrait, Set};
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;
use xeta_invest::models::_entities::{instruments, watchlist_items};
use xeta_invest::models::watchlists::{MAX_ITEMS, MAX_PER_USER};

use super::prepare_data::{self, auth_of};

async fn create_watchlist(
    request: &loco_rs::TestServer,
    user: &prepare_data::LoggedInUser,
    name: &str,
) -> Value {
    let (auth_key, auth_value) = auth_of(user);
    let response = request
        .post("/api/watchlists")
        .add_header(auth_key, auth_value)
        .json(&serde_json::json!({ "name": name }))
        .await;
    assert_eq!(response.status_code(), 201, "{}", response.text());
    serde_json::from_str(&response.text()).unwrap()
}

fn first_list(page: &Value) -> &Value {
    &page["watchlists"][0]
}

fn default_section_id(page: &Value) -> i64 {
    first_list(page)["sections"][0]["id"].as_i64().unwrap()
}

fn watchlist_id(page: &Value) -> i64 {
    first_list(page)["id"].as_i64().unwrap()
}

#[tokio::test]
#[serial]
async fn guest_cannot_list_watchlists() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/watchlists").await;
        assert_eq!(response.status_code(), 401);
        let summary = request.get("/api/watchlists/summary").await;
        assert_eq!(summary.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_can_create_a_watchlist_with_default_section() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        assert_eq!(page["watchlists"].as_array().unwrap().len(), 1);
        let list = first_list(&page);
        assert_eq!(list["name"], "Tech");
        assert_eq!(list["user_id"], Value::Null);
        assert_eq!(list["sections"].as_array().unwrap().len(), 1);
        assert_eq!(list["sections"][0]["is_default"], true);
        assert_eq!(list["sections"][0]["name"], "Général");
        assert_eq!(page["limits"]["max_per_user"], MAX_PER_USER);
        assert_eq!(page["limits"]["max_items"], MAX_ITEMS);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn duplicate_name_is_unprocessable() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        create_watchlist(&request, &user, "Same").await;
        let (auth_key, auth_value) = auth_of(&user);
        let second = request
            .post("/api/watchlists")
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "name": "Same" }))
            .await;
        assert_eq!(second.status_code(), 400);
        let body: Value = serde_json::from_str(&second.text()).unwrap();
        assert!(body["errors"]["name"].is_array());
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_cannot_exceed_the_watchlist_limit() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        for i in 0..MAX_PER_USER {
            create_watchlist(&request, &user, &format!("List {i}")).await;
        }
        let (auth_key, auth_value) = auth_of(&user);
        let overflow = request
            .post("/api/watchlists")
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "name": "Overflow" }))
            .await;
        assert_eq!(overflow.status_code(), 400);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_can_rename_and_delete_a_watchlist() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Old").await;
        let id = watchlist_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let renamed = request
            .put(&format!("/api/watchlists/{id}"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "New" }))
            .await;
        assert_eq!(renamed.status_code(), 200);
        let body: Value = serde_json::from_str(&renamed.text()).unwrap();
        assert_eq!(body["watchlists"][0]["name"], "New");

        let deleted = request
            .delete(&format!("/api/watchlists/{id}"))
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(deleted.status_code(), 204);

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key, auth_value)
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        assert_eq!(listed["watchlists"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn other_users_watchlist_is_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &owner, "Secret").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);

        let stranger = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "other",
            "other@loco.com",
            "12341234",
        )
        .await;
        let (stranger_key, stranger_value) = auth_of(&stranger);

        let update = request
            .put(&format!("/api/watchlists/{id}"))
            .add_header(stranger_key.clone(), stranger_value.clone())
            .json(&serde_json::json!({ "name": "Hacked" }))
            .await;
        assert_eq!(update.status_code(), 404);

        let add = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(stranger_key.clone(), stranger_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;
        assert_eq!(add.status_code(), 404);

        let list = request
            .get("/api/watchlists")
            .add_header(stranger_key, stranger_value)
            .await;
        let listed: Value = serde_json::from_str(&list.text()).unwrap();
        assert_eq!(listed["watchlists"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_can_add_and_remove_items() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let added = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;
        assert_eq!(added.status_code(), 201);
        let body: Value = serde_json::from_str(&added.text()).unwrap();
        assert_eq!(body["status"], "added");

        let tsla = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "TSLA", "section_id": section_id }))
            .await;
        assert_eq!(tsla.status_code(), 201);

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        let items = listed["watchlists"][0]["sections"][0]["items"]
            .as_array()
            .unwrap();
        assert_eq!(items.len(), 2);
        let item_id = items[0]["id"].as_i64().unwrap();
        assert_eq!(items[0]["instrument"]["symbol"], "AAPL");

        let dup = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;
        assert_eq!(dup.status_code(), 200);
        let dup: Value = serde_json::from_str(&dup.text()).unwrap();
        assert_eq!(dup["status"], "already_present");

        let missing = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "MISSING", "section_id": section_id }))
            .await;
        assert_eq!(missing.status_code(), 400);

        let removed = request
            .delete(&format!("/api/watchlist-items/{item_id}"))
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(removed.status_code(), 204);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn adding_to_another_section_moves_the_item() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let default_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let created_section = request
            .post(&format!("/api/watchlists/{id}/sections"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Crypto" }))
            .await;
        assert_eq!(created_section.status_code(), 201);
        let body: Value = serde_json::from_str(&created_section.text()).unwrap();
        let target_id = body["watchlists"][0]["sections"][1]["id"].as_i64().unwrap();

        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": default_id }))
            .await;

        let moved = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": target_id }))
            .await;
        assert_eq!(moved.status_code(), 200);
        let moved: Value = serde_json::from_str(&moved.text()).unwrap();
        assert_eq!(moved["status"], "moved");

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key, auth_value)
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        assert_eq!(
            listed["watchlists"][0]["sections"][0]["items"]
                .as_array()
                .unwrap()
                .len(),
            0
        );
        assert_eq!(
            listed["watchlists"][0]["sections"][1]["items"][0]["instrument"]["symbol"],
            "AAPL"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn cannot_add_item_to_section_from_another_watchlist() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let first = create_watchlist(&request, &user, "A").await;
        let second = create_watchlist(&request, &user, "B").await;
        let first_id = first["active_watchlist_id"].as_i64().unwrap();
        let second_list = second["watchlists"]
            .as_array()
            .unwrap()
            .iter()
            .find(|list| list["name"] == "B")
            .unwrap();
        let other_section = second_list["sections"][0]["id"].as_i64().unwrap();
        let (auth_key, auth_value) = auth_of(&user);

        let response = request
            .post(&format!("/api/watchlists/{first_id}/items"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": other_section }))
            .await;
        assert_eq!(response.status_code(), 400);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert!(body["errors"]["section_id"].is_array());
    })
    .await;
}

#[tokio::test]
#[serial]
async fn cannot_exceed_max_items_per_watchlist() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Full").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);

        for i in 0..MAX_ITEMS {
            let instrument = instruments::ActiveModel {
                symbol: Set(format!("S{i:02}")),
                name: Set(format!("Stub {i}")),
                currency: Set("USD".into()),
                ..Default::default()
            }
            .insert(&ctx.db)
            .await
            .unwrap();
            watchlist_items::ActiveModel {
                watchlist_id: Set(id),
                watchlist_section_id: Set(section_id),
                instrument_id: Set(instrument.id),
                position: Set(i64::try_from(i).unwrap()),
                ..Default::default()
            }
            .insert(&ctx.db)
            .await
            .unwrap();
        }

        let (auth_key, auth_value) = auth_of(&user);
        let overflow = request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;
        assert_eq!(overflow.status_code(), 400);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn default_section_cannot_be_deleted_and_items_move() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let default_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let forbidden = request
            .delete(&format!("/api/watchlist-sections/{default_id}"))
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(forbidden.status_code(), 400);

        let created = request
            .post(&format!("/api/watchlists/{id}/sections"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Tech" }))
            .await;
        let body: Value = serde_json::from_str(&created.text()).unwrap();
        let extra_id = body["watchlists"][0]["sections"][1]["id"].as_i64().unwrap();

        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": extra_id }))
            .await;

        let deleted = request
            .delete(&format!("/api/watchlist-sections/{extra_id}"))
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(deleted.status_code(), 204);

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key, auth_value)
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        assert_eq!(
            listed["watchlists"][0]["sections"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        assert_eq!(
            listed["watchlists"][0]["sections"][0]["items"][0]["instrument"]["symbol"],
            "AAPL"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn section_names_must_be_unique_and_can_be_renamed() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let default_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let created = request
            .post(&format!("/api/watchlists/{id}/sections"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Tech" }))
            .await;
        assert_eq!(created.status_code(), 201);

        let dup = request
            .post(&format!("/api/watchlists/{id}/sections"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Tech" }))
            .await;
        assert_eq!(dup.status_code(), 400);

        let renamed = request
            .put(&format!("/api/watchlist-sections/{default_id}"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "name": "Principale" }))
            .await;
        assert_eq!(renamed.status_code(), 200);
        let body: Value = serde_json::from_str(&renamed.text()).unwrap();
        assert_eq!(body["watchlists"][0]["sections"][0]["name"], "Principale");
        assert_eq!(body["watchlists"][0]["sections"][0]["is_default"], true);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_can_reorder_sections_and_items() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let default_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        let created = request
            .post(&format!("/api/watchlists/{id}/sections"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Other" }))
            .await;
        let body: Value = serde_json::from_str(&created.text()).unwrap();
        let other_id = body["watchlists"][0]["sections"][1]["id"].as_i64().unwrap();

        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": default_id }))
            .await;
        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "MSFT", "section_id": default_id }))
            .await;

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        let items = listed["watchlists"][0]["sections"][0]["items"]
            .as_array()
            .unwrap();
        let aapl_id = items
            .iter()
            .find(|item| item["instrument"]["symbol"] == "AAPL")
            .unwrap()["id"]
            .as_i64()
            .unwrap();
        let msft_id = items
            .iter()
            .find(|item| item["instrument"]["symbol"] == "MSFT")
            .unwrap()["id"]
            .as_i64()
            .unwrap();

        let reordered = request
            .patch(&format!("/api/watchlists/{id}/reorder"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({
                "sections": [
                    { "id": other_id, "item_ids": [msft_id] },
                    { "id": default_id, "item_ids": [aapl_id] }
                ]
            }))
            .await;
        assert_eq!(reordered.status_code(), 200);
        let body: Value = serde_json::from_str(&reordered.text()).unwrap();
        assert_eq!(body["watchlists"][0]["sections"][0]["id"], other_id);
        assert_eq!(
            body["watchlists"][0]["sections"][0]["items"][0]["instrument"]["symbol"],
            "MSFT"
        );
        assert_eq!(body["watchlists"][0]["sections"][1]["id"], default_id);

        let incomplete = request
            .patch(&format!("/api/watchlists/{id}/reorder"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({
                "sections": [
                    { "id": default_id, "item_ids": [aapl_id] }
                ]
            }))
            .await;
        assert_eq!(incomplete.status_code(), 400);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn removing_an_item_compacts_positions() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;
        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "MSFT", "section_id": section_id }))
            .await;

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        let first_id = listed["watchlists"][0]["sections"][0]["items"][0]["id"]
            .as_i64()
            .unwrap();

        request
            .delete(&format!("/api/watchlist-items/{first_id}"))
            .add_header(auth_key.clone(), auth_value.clone())
            .await;

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_key, auth_value)
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        // Positions are 0-based: MSFT moves up from 1 to 0.
        let items = &listed["watchlists"][0]["sections"][0]["items"];
        assert_eq!(items.as_array().unwrap().len(), 1);
        assert_eq!(items[0]["instrument"]["symbol"], "MSFT");
        assert_eq!(items[0]["position"], 0);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn summary_returns_only_user_watchlists() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        create_watchlist(&request, &user, "Mine A").await;
        create_watchlist(&request, &user, "Mine B").await;
        let other = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "other",
            "other@loco.com",
            "12341234",
        )
        .await;
        create_watchlist(&request, &other, "Other").await;

        let (auth_key, auth_value) = auth_of(&user);
        let response = request
            .get("/api/watchlists/summary")
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        let data = body["data"].as_array().unwrap();
        assert_eq!(data.len(), 2);
        let names: Vec<&str> = data
            .iter()
            .map(|row| row["name"].as_str().unwrap())
            .collect();
        assert!(names.contains(&"Mine A"));
        assert!(names.contains(&"Mine B"));
        assert!(!names.contains(&"Other"));
        assert!(data[0]["default_section_id"].as_i64().is_some());
    })
    .await;
}

#[tokio::test]
#[serial]
async fn history_only_accepts_symbols_from_the_user_watchlists() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &user, "Tech").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);
        let (auth_key, auth_value) = auth_of(&user);

        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;

        let msft = request
            .get("/api/watchlists/history?symbols=MSFT")
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(msft.status_code(), 200);
        let body: Value = serde_json::from_str(&msft.text()).unwrap();
        assert_eq!(body["data"], serde_json::json!({}));

        let aapl = request
            .get("/api/watchlists/history?symbols=AAPL")
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(aapl.status_code(), 200);
        let body: Value = serde_json::from_str(&aapl.text()).unwrap();
        let points = body["data"]["AAPL"].as_array().unwrap();
        assert_eq!(points.len(), 3);
        assert_eq!(points[0]["t"], 1_700_000_000_000i64);
        assert_eq!(points[2]["v"], 200.0);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn cannot_remove_another_users_item() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let page = create_watchlist(&request, &owner, "Tech").await;
        let id = watchlist_id(&page);
        let section_id = default_section_id(&page);
        let (owner_key, owner_value) = auth_of(&owner);
        request
            .post(&format!("/api/watchlists/{id}/items"))
            .add_header(owner_key, owner_value)
            .json(&serde_json::json!({ "symbol": "AAPL", "section_id": section_id }))
            .await;

        let listed = request
            .get("/api/watchlists")
            .add_header(auth_of(&owner).0, auth_of(&owner).1)
            .await;
        let listed: Value = serde_json::from_str(&listed.text()).unwrap();
        let item_id = listed["watchlists"][0]["sections"][0]["items"][0]["id"]
            .as_i64()
            .unwrap();

        let stranger = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "other",
            "other@loco.com",
            "12341234",
        )
        .await;
        let (stranger_key, stranger_value) = auth_of(&stranger);
        let response = request
            .delete(&format!("/api/watchlist-items/{item_id}"))
            .add_header(stranger_key, stranger_value)
            .await;
        assert_eq!(response.status_code(), 404);
    })
    .await;
}
