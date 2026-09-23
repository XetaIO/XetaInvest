use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data;

#[tokio::test]
#[serial]
async fn guest_is_unauthorized() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/symbol-search?q=AAP").await;
        assert_eq!(response.status_code(), 401, "guests must not search");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn short_query_returns_empty_list() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbol-search?q=a")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["data"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn empty_query_returns_empty_list() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbol-search")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["data"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn authenticated_user_can_search_symbols() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbol-search?q=AAP&region=FR&limit=25")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        let data = body["data"].as_array().expect("data array");
        assert_eq!(data.len(), 2);
        assert_eq!(data[0]["symbol"], "AAPL");
        assert_eq!(data[0]["type"], "equity");
        assert_eq!(data[0]["logo_url"], "https://example.com/aapl.png");
        assert_eq!(data[1]["logo_url"], Value::Null);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn provider_failure_returns_empty_list() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbol-search?q=fail")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["data"], serde_json::json!([]));
    })
    .await;
}
