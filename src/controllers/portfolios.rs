//! `/api/portfolios`: CRUD on the signed-in user's portfolios.
//!
//! Portfolios of other users behave as if they did not exist (404).

use axum::http::StatusCode;
use loco_rs::prelude::*;

use crate::actions::portfolios::{
    create_portfolio::CreatePortfolioAction, delete_portfolio::DeletePortfolioAction,
    set_default_portfolio::SetDefaultPortfolioAction, update_portfolio::UpdatePortfolioAction,
};
use crate::controllers::http::CurrentUser;
use crate::dtos::portfolios::{CreatePortfolio, PortfolioDto, UpdatePortfolio};
use crate::models::_entities::portfolios::Entity;

/// Lists the user's portfolios (default first, then by name).
#[debug_handler]
async fn list(auth: CurrentUser, State(ctx): State<AppContext>) -> Result<Response> {
    let rows = Entity::list_for_user(&ctx.db, auth.user.id).await?;
    format::json(rows.into_iter().map(PortfolioDto::from).collect::<Vec<_>>())
}

#[debug_handler]
async fn get_one(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    let portfolio = Entity::find_owned(&ctx.db, auth.user.id, id)
        .await?
        .ok_or(Error::NotFound)?;
    format::json(PortfolioDto::from(portfolio))
}

/// Creates a portfolio (201). The owner always comes from the session, never the body.
#[debug_handler]
async fn create(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<CreatePortfolio>,
) -> Result<Response> {
    let portfolio = CreatePortfolioAction::run(&ctx, auth.user.id, params).await?;
    Ok((StatusCode::CREATED, Json(PortfolioDto::from(portfolio))).into_response())
}

#[debug_handler]
async fn update(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<UpdatePortfolio>,
) -> Result<Response> {
    let portfolio = UpdatePortfolioAction::run(&ctx, auth.user.id, id, params).await?;
    format::json(PortfolioDto::from(portfolio))
}

/// Deletes a portfolio with its positions and transactions (204).
#[debug_handler]
async fn remove(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeletePortfolioAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

/// Makes a portfolio the user's only default.
#[debug_handler]
async fn set_default(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    let portfolio = SetDefaultPortfolioAction::run(&ctx, auth.user.id, id).await?;
    format::json(PortfolioDto::from(portfolio))
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/portfolios")
        .add("/", get(list))
        .add("/", post(create))
        .add("/{id}", get(get_one))
        .add("/{id}", put(update))
        .add("/{id}", delete(remove))
        .add("/{id}/default", post(set_default))
}
