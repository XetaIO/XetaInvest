use loco_rs::TestServer;
use loco_rs::testing::prelude::*;
use rust_decimal::Decimal;
use sea_orm::EntityTrait;
use serde_json::{Value, json};
use serial_test::serial;
use xeta_invest::{app::App, models::_entities::transactions};

use super::assert_field_error;
use super::prepare_data::{self, LoggedInUser, auth_of};

/// Creates a portfolio holding `AAPL` with one buy line; returns the position id.
async fn position_with_buy(request: &TestServer, user: &LoggedInUser, quantity: Value) -> i64 {
    let (key, value) = auth_of(user);
    let portfolio: Value = request
        .post("/api/portfolios")
        .add_header(key.clone(), value.clone())
        .json(&json!({ "name": "Core" }))
        .await
        .json();
    let portfolio_id = portfolio["id"].as_i64().unwrap();

    let created = request
        .post(&format!("/api/portfolios/{portfolio_id}/positions"))
        .add_header(key, value)
        .json(&json!({
            "symbol": "AAPL",
            "lines": [{ "quantity": quantity, "unit_price": 100, "executed_at": "2026-01-15" }]
        }))
        .await;
    assert_eq!(created.status_code(), 201, "{}", created.text());
    created.json::<Value>()["id"].as_i64().unwrap()
}

fn line(kind: &str, quantity: &Value, date: &str) -> Value {
    json!({ "kind": kind, "quantity": quantity, "unit_price": 120, "executed_at": date })
}

#[tokio::test]
#[serial]
async fn guest_cannot_write_transactions() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request
            .post("/api/positions/1/transactions")
            .json(&line("buy", &json!(1), "2026-01-15"))
            .await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn create_update_and_delete_a_transaction() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let position_id = position_with_buy(&request, &user, json!(2)).await;

        let created = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key.clone(), value.clone())
            .json(&line("sell", &json!(1), "2026-02-01"))
            .await;
        assert_eq!(created.status_code(), 201);
        let created: Value = created.json();
        assert_eq!(created["kind"], "sell");
        assert_eq!(created["quantity"], 1.0);
        assert_eq!(created["position_id"], position_id);
        let id = created["id"].as_i64().unwrap();

        let updated = request
            .put(&format!("/api/transactions/{id}"))
            .add_header(key.clone(), value.clone())
            .json(&line("sell", &json!(1.5), "2026-02-02"))
            .await;
        assert_eq!(updated.status_code(), 200);
        let updated: Value = updated.json();
        assert_eq!(updated["quantity"], 1.5);
        assert_eq!(updated["executed_at"], "2026-02-02");

        let deleted = request
            .delete(&format!("/api/transactions/{id}"))
            .add_header(key, value)
            .await;
        assert_eq!(deleted.status_code(), 204);
        assert!(
            transactions::Entity::find_by_id(id)
                .one(&ctx.db)
                .await
                .unwrap()
                .is_none()
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn fractional_amounts_are_stored_exactly() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let position_id = position_with_buy(&request, &user, json!(0.1)).await;

        // Both a JSON number and a decimal string are accepted.
        let created: Value = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key, value)
            .json(&line("buy", &json!("0.2"), "2026-01-16"))
            .await
            .json();

        let rows = transactions::Entity::find().all(&ctx.db).await.unwrap();
        let expected: Vec<Decimal> = vec!["0.1".parse().unwrap(), "0.2".parse().unwrap()];
        let mut stored: Vec<Decimal> = rows.iter().map(|row| row.quantity.normalize()).collect();
        stored.sort();
        assert_eq!(stored, expected, "no binary floating-point residue");
        assert_eq!(created["quantity"], 0.2);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn amounts_with_more_than_four_decimals_are_rejected() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let position_id = position_with_buy(&request, &user, json!(1)).await;

        let response = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key, value)
            .json(&line("buy", &json!("0.00001"), "2026-01-16"))
            .await;
        assert_eq!(response.status_code(), 400);
        assert_field_error(&response.text(), "quantity");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn an_update_that_would_oversell_is_rejected_and_rolled_back() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let position_id = position_with_buy(&request, &user, json!(2)).await;
        let sell: Value = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key.clone(), value.clone())
            .json(&line("sell", &json!(1), "2026-02-01"))
            .await
            .json();
        let sell_id = sell["id"].as_i64().unwrap();

        let response = request
            .put(&format!("/api/transactions/{sell_id}"))
            .add_header(key, value)
            .json(&line("sell", &json!(3), "2026-02-01"))
            .await;
        assert_eq!(response.status_code(), 400);
        assert_field_error(&response.text(), "quantity");

        let row = transactions::Entity::find_by_id(sell_id)
            .one(&ctx.db)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(row.quantity, Decimal::ONE, "the update was rolled back");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn deleting_the_buy_behind_a_sell_is_rejected() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = auth_of(&user);
        let position_id = position_with_buy(&request, &user, json!(1)).await;
        let extra_buy: Value = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key.clone(), value.clone())
            .json(&line("buy", &json!(1), "2026-01-20"))
            .await
            .json();
        let sell = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key.clone(), value.clone())
            .json(&line("sell", &json!(2), "2026-02-01"))
            .await;
        assert_eq!(sell.status_code(), 201);

        let extra_id = extra_buy["id"].as_i64().unwrap();
        let response = request
            .delete(&format!("/api/transactions/{extra_id}"))
            .add_header(key, value)
            .await;
        assert_eq!(response.status_code(), 400);
        assert_field_error(&response.text(), "quantity");
        assert!(
            transactions::Entity::find_by_id(extra_id)
                .one(&ctx.db)
                .await
                .unwrap()
                .is_some()
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn other_users_transactions_are_not_found() {
    request::<App, _, _>(|request, ctx| async move {
        let owner = prepare_data::init_user_login(&request, &ctx).await;
        let position_id = position_with_buy(&request, &owner, json!(1)).await;
        let row = transactions::Entity::find()
            .one(&ctx.db)
            .await
            .unwrap()
            .unwrap();

        let stranger = prepare_data::init_user_login_with(
            &request,
            &ctx,
            "other",
            "other@loco.com",
            "12341234",
        )
        .await;
        let (key, value) = auth_of(&stranger);

        let create = request
            .post(&format!("/api/positions/{position_id}/transactions"))
            .add_header(key.clone(), value.clone())
            .json(&line("buy", &json!(1), "2026-01-16"))
            .await;
        assert_eq!(create.status_code(), 404);
        let update = request
            .put(&format!("/api/transactions/{}", row.id))
            .add_header(key.clone(), value.clone())
            .json(&line("buy", &json!(5), "2026-01-16"))
            .await;
        assert_eq!(update.status_code(), 404);
        let delete = request
            .delete(&format!("/api/transactions/{}", row.id))
            .add_header(key, value)
            .await;
        assert_eq!(delete.status_code(), 404);
    })
    .await;
}
