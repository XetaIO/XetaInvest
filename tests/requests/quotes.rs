use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data;

#[tokio::test]
#[serial]
async fn guest_cannot_fetch_quotes() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/quotes?symbols=AAPL").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn empty_symbols_returns_empty_map() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/quotes?symbols=")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["quotes"], serde_json::json!({}));
        assert!(body["fetched_at"].as_str().is_some());
    })
    .await;
}

#[tokio::test]
#[serial]
async fn authenticated_user_gets_batched_quotes() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/quotes?symbols=AAPL,MSFT")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["quotes"]["AAPL"]["regular_market_price"], 200.0);
        assert_eq!(body["quotes"]["MSFT"]["regular_market_price"], 200.0);
        assert_eq!(body["quotes"]["AAPL"]["quote_type"], "equity");
        assert_eq!(
            body["quotes"]["AAPL"]["logo_url"],
            "https://example.com/aapl.png"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn provider_failure_returns_503() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/quotes?symbols=FAIL")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(response.status_code(), 503);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["error"], "market_data_unavailable");
    })
    .await;
}
