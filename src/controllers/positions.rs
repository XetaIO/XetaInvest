//! Position writes: add a ticker (with buy lots) to a portfolio, or remove it.

use axum::http::StatusCode;
use loco_rs::prelude::*;

use crate::actions::positions::{
    create_position::CreatePositionAction, delete_position::DeletePositionAction,
};
use crate::controllers::http::CurrentUser;
use crate::dtos::positions::{CreatePosition, PositionDto};

/// Adds a ticker and its buy lots to an owned portfolio (201).
///
/// Unknown symbols are a 400 on `symbol`; foreign portfolios are 404.
#[debug_handler]
async fn create(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(portfolio_id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<CreatePosition>,
) -> Result<Response> {
    let position = CreatePositionAction::run(&ctx, auth.user.id, portfolio_id, params).await?;
    Ok((StatusCode::CREATED, Json(PositionDto::from(position))).into_response())
}

/// Deletes an owned position and its transactions (204).
#[debug_handler]
async fn remove(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeletePositionAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api")
        .add("/portfolios/{portfolio_id}/positions", post(create))
        .add("/positions/{id}", delete(remove))
}
