use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data::{self, auth_of};

#[tokio::test]
#[serial]
async fn guest_cannot_list_portfolios() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/portfolios").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn create_uses_jwt_user_not_json_user_id() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);

        let response = request
            .post("/api/portfolios")
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({
                "name": "Core",
                "user_id": 999_999
            }))
            .await;

        assert_eq!(response.status_code(), 201);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["name"], "Core");
        assert_eq!(body["user_id"], user.user.id);
        assert_eq!(body["is_default"], true);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn duplicate_name_is_unprocessable() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);

        let first = request
            .post("/api/portfolios")
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Core" }))
            .await;
        assert_eq!(first.status_code(), 201);

        let second = request
            .post("/api/portfolios")
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({ "name": "Core" }))
            .await;
        assert_eq!(second.status_code(), 400);
        super::assert_field_error(&second.text(), "name");
        let body: Value = serde_json::from_str(&second.text()).unwrap();
        assert_eq!(
            body["errors"]["name"][0]["message"],
            "Name has already been taken"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn other_users_portfolio_is_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let (owner_key, owner_value) = auth_of(&owner);
        let created = request
            .post("/api/portfolios")
            .add_header(owner_key, owner_value)
            .json(&serde_json::json!({ "name": "Secret" }))
            .await;
        let body: Value = serde_json::from_str(&created.text()).unwrap();
        let id = body["id"].as_i64().unwrap();

        let stranger = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "other",
            "other@loco.com",
            "12341234",
        )
        .await;
        let (stranger_key, stranger_value) = auth_of(&stranger);

        let get = request
            .get(&format!("/api/portfolios/{id}"))
            .add_header(stranger_key.clone(), stranger_value.clone())
            .await;
        assert_eq!(get.status_code(), 404);

        let list = request
            .get("/api/portfolios")
            .add_header(stranger_key, stranger_value)
            .await;
        assert_eq!(list.status_code(), 200);
        let listed: Value = serde_json::from_str(&list.text()).unwrap();
        assert_eq!(listed, serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn set_default_is_exclusive() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);

        let first = request
            .post("/api/portfolios")
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "A" }))
            .await;
        let second = request
            .post("/api/portfolios")
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "B" }))
            .await;
        let a: Value = serde_json::from_str(&first.text()).unwrap();
        let b: Value = serde_json::from_str(&second.text()).unwrap();
        assert_eq!(a["is_default"], true);
        assert_eq!(b["is_default"], false);

        let set = request
            .post(&format!("/api/portfolios/{}/default", b["id"]))
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(set.status_code(), 200);

        let listed = request
            .get("/api/portfolios")
            .add_header(auth_key, auth_value)
            .await;
        let rows: Vec<Value> = serde_json::from_str(&listed.text()).unwrap();
        let defaults: Vec<_> = rows
            .iter()
            .filter(|row| row["is_default"] == true)
            .collect();
        assert_eq!(defaults.len(), 1);
        assert_eq!(defaults[0]["id"], b["id"]);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn deleting_the_default_promotes_the_oldest_remaining() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let mut ids = Vec::new();
        for name in ["First", "Second", "Third"] {
            let created: serde_json::Value = request
                .post("/api/portfolios")
                .add_header(key.clone(), value.clone())
                .json(&serde_json::json!({ "name": name }))
                .await
                .json();
            ids.push(created["id"].as_i64().unwrap());
        }
        let set_default = request
            .post(&format!("/api/portfolios/{}/default", ids[2]))
            .add_header(key.clone(), value.clone())
            .await;
        assert_eq!(set_default.status_code(), 200);

        let deleted = request
            .delete(&format!("/api/portfolios/{}", ids[2]))
            .add_header(key.clone(), value.clone())
            .await;
        assert_eq!(deleted.status_code(), 204);

        let listed: serde_json::Value = request
            .get("/api/portfolios")
            .add_header(key, value)
            .await
            .json();
        let defaults: Vec<i64> = listed
            .as_array()
            .unwrap()
            .iter()
            .filter(|row| row["is_default"] == true)
            .map(|row| row["id"].as_i64().unwrap())
            .collect();
        assert_eq!(defaults, [ids[0]]);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_cannot_exceed_the_portfolio_limit() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let limit = xeta_invest::models::portfolios::MAX_PER_USER;
        for n in 0..limit {
            let created = request
                .post("/api/portfolios")
                .add_header(key.clone(), value.clone())
                .json(&serde_json::json!({ "name": format!("P{n}") }))
                .await;
            assert_eq!(created.status_code(), 201);
        }

        let over = request
            .post("/api/portfolios")
            .add_header(key, value)
            .json(&serde_json::json!({ "name": "One too many" }))
            .await;
        assert_eq!(over.status_code(), 400);
        super::assert_field_error(&over.text(), "name");
    })
    .await;
}
