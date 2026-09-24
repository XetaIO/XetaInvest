use axum::http::{HeaderName, HeaderValue};
use loco_rs::TestServer;
use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data::{self, auth_of};

/// Creates a portfolio holding 10 AAPL bought at 100 USD; returns its id.
async fn portfolio_with_aapl(
    request: &TestServer,
    auth: &(HeaderName, HeaderValue),
    name: &str,
) -> i64 {
    let created = request
        .post("/api/portfolios")
        .add_header(auth.0.clone(), auth.1.clone())
        .json(&serde_json::json!({ "name": name }))
        .await;
    let portfolio: Value = serde_json::from_str(&created.text()).unwrap();
    let portfolio_id = portfolio["id"].as_i64().unwrap();
    let position = request
        .post(&format!("/api/portfolios/{portfolio_id}/positions"))
        .add_header(auth.0.clone(), auth.1.clone())
        .json(&serde_json::json!({
            "symbol": "AAPL",
            "lines": [{ "quantity": 10, "unit_price": 100, "executed_at": "2026-01-15" }]
        }))
        .await;
    assert_eq!(position.status_code(), 201);
    portfolio_id
}

#[tokio::test]
#[serial]
async fn guest_cannot_fetch_statistics() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/statistics").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn user_without_portfolio_gets_empty_statistics() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);
        let response = request
            .get("/api/statistics")
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["scope"]["type"], "all");
        assert_eq!(body["portfolios"], serde_json::json!([]));
        assert_eq!(body["totals"]["position_count"], 0);
        assert_eq!(body["history"].as_array().unwrap().len(), 1);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn statistics_default_to_all_portfolios_in_eur() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let auth = auth_of(&user);
        portfolio_with_aapl(&request, &auth, "Core").await;
        portfolio_with_aapl(&request, &auth, "Side").await;

        let response = request
            .get("/api/statistics")
            .add_header(auth.0, auth.1)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["scope"]["type"], "all");
        // 2 × 10 AAPL: invested 2000 USD, quote 200 → 4000 USD. Mock USD→EUR = 0.92.
        assert_eq!(body["totals"]["invested_eur"], 1840.0);
        assert_eq!(body["totals"]["current_value_eur"], 3680.0);
        assert_eq!(body["totals"]["position_count"], 2);
        assert_eq!(body["totals"]["portfolio_count"], 2);
        assert_eq!(body["allocations"]["by_instrument"][0]["symbol"], "AAPL");
        assert_eq!(
            body["allocations"]["by_portfolio"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn statistics_filter_by_owned_portfolio() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let auth = auth_of(&user);
        let core = portfolio_with_aapl(&request, &auth, "Core").await;
        portfolio_with_aapl(&request, &auth, "Side").await;

        let response = request
            .get(&format!("/api/statistics?portfolio={core}&refresh=true"))
            .add_header(auth.0, auth.1)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["scope"]["type"], "portfolio");
        assert_eq!(body["scope"]["id"], core);
        assert_eq!(body["scope"]["name"], "Core");
        assert_eq!(body["totals"]["position_count"], 1);
        assert_eq!(body["allocations"]["by_portfolio"], serde_json::json!([]));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn another_users_portfolio_is_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let theirs = portfolio_with_aapl(&request, &auth_of(&owner), "Theirs").await;
        let intruder = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "intruder",
            "intruder@loco.com",
            "12341234",
        )
        .await;
        let (auth_key, auth_value) = auth_of(&intruder);

        let response = request
            .get(&format!("/api/statistics?portfolio={theirs}"))
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 404);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn malformed_scope_is_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);
        let response = request
            .get("/api/statistics?portfolio=abc")
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 404);
    })
    .await;
}
