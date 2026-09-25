//! Transaction writes. Every write re-checks that the position never goes
//! negative (400 on `quantity` otherwise).

use axum::http::StatusCode;
use loco_rs::prelude::*;

use crate::actions::transactions::{
    create_transaction::CreateTransactionAction, delete_transaction::DeleteTransactionAction,
    update_transaction::UpdateTransactionAction,
};
use crate::controllers::http::CurrentUser;
use crate::dtos::transactions::{TransactionDto, UpsertTransaction};

/// Adds a buy/sell line to an owned position (201).
#[debug_handler]
async fn create(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(position_id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<UpsertTransaction>,
) -> Result<Response> {
    let row = CreateTransactionAction::run(&ctx, auth.user.id, position_id, params).await?;
    Ok((StatusCode::CREATED, Json(TransactionDto::try_from(row)?)).into_response())
}

#[debug_handler]
async fn update(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<UpsertTransaction>,
) -> Result<Response> {
    let row = UpdateTransactionAction::run(&ctx, auth.user.id, id, params).await?;
    format::json(TransactionDto::try_from(row)?)
}

/// Deletes an owned transaction (204).
#[debug_handler]
async fn remove(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeleteTransactionAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api")
        .add("/positions/{position_id}/transactions", post(create))
        .add("/transactions/{id}", put(update))
        .add("/transactions/{id}", delete(remove))
}
