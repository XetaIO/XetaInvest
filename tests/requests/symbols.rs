use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data;

#[tokio::test]
#[serial]
async fn guest_cannot_fetch_symbol_page() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/symbols/AAPL").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn guest_cannot_fetch_symbol_chart() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/symbols/AAPL/chart?range=1mo").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn authenticated_user_gets_symbol_page() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/AAPL")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["symbol"], "AAPL");
        assert_eq!(body["quote"]["price"], 200.0);
        assert_eq!(body["quote"]["type"], "equity");
        assert_eq!(body["quote"]["logo_url"], "https://example.com/aapl.png");
        assert!(body["quote_error"].is_null());
        assert_eq!(body["chart"]["range"], "1mo");
        assert_eq!(body["chart"]["points"].as_array().unwrap().len(), 3);
        assert_eq!(body["news"].as_array().unwrap().len(), 1);
        assert_eq!(body["news"][0]["title"], "AAPL posts record quarter");
        assert_eq!(body["recommendations"][0]["symbol"], "MSFT");
        assert_eq!(body["recommendations"][0]["name"], "MSFT Inc");
        assert_eq!(body["available_ranges"][0], "1d");
        assert_eq!(body["available_ranges"][2], "1mo");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn unknown_symbol_returns_empty_quote() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/MISSING")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["symbol"], "MISSING");
        assert!(body["quote"].is_null());
        assert!(body["quote_error"].is_null());
        assert_eq!(body["chart"]["points"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn provider_failure_sets_quote_error() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/FAIL")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["symbol"], "FAIL");
        assert!(body["quote"].is_null());
        assert!(!body["quote_error"].as_str().unwrap().is_empty());
        assert_eq!(body["chart"]["points"], serde_json::json!([]));
        assert_eq!(body["news"], serde_json::json!([]));
        assert_eq!(body["recommendations"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn chart_returns_points_for_range() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/AAPL/chart?range=1y")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["symbol"], "AAPL");
        assert_eq!(body["range"], "1y");
        assert_eq!(body["points"].as_array().unwrap().len(), 3);
        assert_eq!(body["points"][2]["close"], 200.0);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn invalid_chart_range_falls_back_to_one_month() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/AAPL/chart?range=bogus")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["range"], "1mo");
        assert_eq!(body["points"].as_array().unwrap().len(), 3);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn chart_provider_failure_returns_503() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/symbols/FAIL/chart?range=1mo")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 503);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["error"], "market_data_unavailable");
    })
    .await;
}
