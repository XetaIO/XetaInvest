use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data::{self, auth_of};

async fn create_portfolio(request: &loco_rs::TestServer, user: &prepare_data::LoggedInUser) -> i64 {
    let (auth_key, auth_value) = auth_of(user);
    let response = request
        .post("/api/portfolios")
        .add_header(auth_key, auth_value)
        .json(&serde_json::json!({ "name": "Core" }))
        .await;
    assert_eq!(response.status_code(), 201);
    let body: Value = serde_json::from_str(&response.text()).unwrap();
    body["id"].as_i64().unwrap()
}

#[tokio::test]
#[serial]
async fn unknown_symbol_is_unprocessable() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let portfolio_id = create_portfolio(&request, &user).await;
        let (auth_key, auth_value) = auth_of(&user);

        let response = request
            .post(&format!("/api/portfolios/{portfolio_id}/positions"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({
                "symbol": "MISSING",
                "lines": [{
                    "quantity": 1,
                    "unit_price": 100,
                    "executed_at": "2026-01-15"
                }]
            }))
            .await;

        assert_eq!(response.status_code(), 400);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["errors"]["symbol"][0]["message"], "Symbol not found.");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn create_position_then_reject_oversell() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let portfolio_id = create_portfolio(&request, &user).await;
        let (auth_key, auth_value) = auth_of(&user);

        let created = request
            .post(&format!("/api/portfolios/{portfolio_id}/positions"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({
                "symbol": "AAPL",
                "lines": [{
                    "quantity": 2,
                    "unit_price": 100,
                    "executed_at": "2026-01-15"
                }]
            }))
            .await;
        assert_eq!(created.status_code(), 201);
        let position: Value = serde_json::from_str(&created.text()).unwrap();
        let position_id = position["id"].as_i64().unwrap();

        let oversell = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({
                "kind": "sell",
                "quantity": 3,
                "unit_price": 120,
                "executed_at": "2026-02-01"
            }))
            .await;
        assert_eq!(oversell.status_code(), 400);
        let body: Value = serde_json::from_str(&oversell.text()).unwrap();
        assert!(body["errors"]["quantity"].is_array());

        let sell = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(auth_key, auth_value)
            .json(&serde_json::json!({
                "kind": "sell",
                "quantity": 1,
                "unit_price": 120,
                "executed_at": "2026-02-01"
            }))
            .await;
        assert_eq!(sell.status_code(), 201);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn other_users_position_is_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let portfolio_id = create_portfolio(&request, &owner).await;
        let (owner_key, owner_value) = auth_of(&owner);
        let created = request
            .post(&format!("/api/portfolios/{portfolio_id}/positions"))
            .add_header(owner_key, owner_value)
            .json(&serde_json::json!({
                "symbol": "AAPL",
                "lines": [{
                    "quantity": 1,
                    "unit_price": 100,
                    "executed_at": "2026-01-15"
                }]
            }))
            .await;
        let position: Value = serde_json::from_str(&created.text()).unwrap();
        let position_id = position["id"].as_i64().unwrap();

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
            .delete(&format!("/api/positions/{position_id}"))
            .add_header(stranger_key, stranger_value)
            .await;
        assert_eq!(response.status_code(), 404);
    })
    .await;
}
