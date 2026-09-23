use loco_rs::testing::prelude::*;
use serde_json::Value;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data::{self, auth_of};

#[tokio::test]
#[serial]
async fn guest_cannot_fetch_dashboard() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/dashboard").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn empty_dashboard_has_no_active_portfolio() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);
        let response = request
            .get("/api/dashboard")
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["portfolios"], serde_json::json!([]));
        assert_eq!(body["active"], serde_json::Value::Null);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn dashboard_converts_native_kpis_to_eur() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = auth_of(&user);

        let created = request
            .post("/api/portfolios")
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({ "name": "Core" }))
            .await;
        let portfolio: Value = serde_json::from_str(&created.text()).unwrap();
        let portfolio_id = portfolio["id"].as_i64().unwrap();

        let position = request
            .post(&format!("/api/portfolios/{portfolio_id}/positions"))
            .add_header(auth_key.clone(), auth_value.clone())
            .json(&serde_json::json!({
                "symbol": "AAPL",
                "lines": [{
                    "quantity": 10,
                    "unit_price": 100,
                    "executed_at": "2026-01-15"
                }]
            }))
            .await;
        assert_eq!(position.status_code(), 201);

        let response = request
            .get(&format!("/api/dashboard?portfolio={portfolio_id}"))
            .add_header(auth_key, auth_value)
            .await;
        assert_eq!(response.status_code(), 200);
        let body: Value = serde_json::from_str(&response.text()).unwrap();
        assert_eq!(body["active"]["portfolio"]["id"], portfolio_id);
        assert_eq!(body["active"]["kpis"]["display_currency"], "EUR");
        // Native: invested 1000 USD, quote 200 → 2000 USD. Mock USD→EUR = 0.92.
        assert_eq!(body["active"]["kpis"]["total_invested"], 920.0);
        assert_eq!(body["active"]["kpis"]["current_value"], 1840.0);
        assert_eq!(body["active"]["kpis"]["pnl"], 920.0);
        assert_eq!(
            body["active"]["kpis"]["positions"][0]["instrument"]["symbol"],
            "AAPL"
        );
        assert_eq!(body["active"]["kpis"]["positions"][0]["quantity"], 10.0);
        assert_eq!(body["active"]["kpis"]["positions"][0]["currency"], "USD");
        assert_eq!(body["active"]["kpis"]["positions"][0]["invested"], 1000.0);
        assert_eq!(
            body["active"]["kpis"]["positions"][0]["invested_eur"],
            920.0
        );
        assert_eq!(body["active"]["kpis"]["positions"][0]["fx_rate"], 0.92);
    })
    .await;
}
