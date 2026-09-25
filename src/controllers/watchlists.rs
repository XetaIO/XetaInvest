//! Watchlists, their sections, and their items.
//!
//! Every write answers with the refreshed page payload (or 204 for deletes)
//! so the SPA can re-render without a second request. Foreign ids are 404.

use axum::http::StatusCode;
use loco_rs::prelude::*;
use serde::Deserialize;

use crate::actions::watchlist_items::{
    add_watchlist_item::AddWatchlistItemAction, delete_watchlist_item::DeleteWatchlistItemAction,
};
use crate::actions::watchlist_sections::{
    create_watchlist_section::CreateWatchlistSectionAction,
    delete_watchlist_section::DeleteWatchlistSectionAction,
    update_watchlist_section::UpdateWatchlistSectionAction,
};
use crate::actions::watchlists::{
    create_watchlist::CreateWatchlistAction, delete_watchlist::DeleteWatchlistAction,
    reorder_watchlist::ReorderWatchlistAction, update_watchlist::UpdateWatchlistAction,
};
use crate::controllers::http::CurrentUser;
use crate::dtos::watchlists::{
    AddWatchlistItem, AddWatchlistItemResponse, CreateWatchlist, CreateWatchlistSection,
    ReorderWatchlist, UpdateWatchlist, UpdateWatchlistSection, WatchlistHistoryResponse,
    WatchlistSummaryDto, WatchlistSummaryResponse,
};
use crate::models::_entities::{watchlist_sections, watchlists};
use crate::services::{watchlist_history, watchlist_page};

#[derive(Debug, Deserialize)]
struct IndexParams {
    /// Active watchlist (defaults to the first one).
    watchlist: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct HistoryParams {
    /// Comma-separated tickers.
    #[serde(default)]
    symbols: String,
}

/// The watchlist page payload.
#[debug_handler]
async fn index(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Query(params): Query<IndexParams>,
) -> Result<Response> {
    format::json(watchlist_page::build(&ctx, auth.user.id, params.watchlist).await?)
}

/// Compact list for the "add to watchlist" menu of the symbol page.
#[debug_handler]
async fn summary(auth: CurrentUser, State(ctx): State<AppContext>) -> Result<Response> {
    let lists = watchlists::Entity::list_for_user(&ctx.db, auth.user.id).await?;
    let list_ids: Vec<i64> = lists.iter().map(|list| list.id).collect();
    let default_sections =
        watchlist_sections::Entity::default_ids_by_watchlist(&ctx.db, &list_ids).await?;
    let data = lists
        .into_iter()
        .map(|list| WatchlistSummaryDto {
            default_section_id: default_sections.get(&list.id).copied(),
            id: list.id,
            name: list.name,
        })
        .collect();
    format::json(WatchlistSummaryResponse { data })
}

/// Intraday spark lines for tickers on the user's watchlists (others are dropped).
#[debug_handler]
async fn history(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Query(params): Query<HistoryParams>,
) -> Result<Response> {
    let data = watchlist_history::build(&ctx, auth.user.id, &params.symbols).await?;
    format::json(WatchlistHistoryResponse { data })
}

/// Creates a watchlist with its default section (201 + page payload).
#[debug_handler]
async fn create(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<CreateWatchlist>,
) -> Result<Response> {
    let user_id = auth.user.id;
    let watchlist = CreateWatchlistAction::run(&ctx, user_id, params.name).await?;
    let payload = watchlist_page::build(&ctx, user_id, Some(watchlist.id)).await?;
    Ok((StatusCode::CREATED, Json(payload)).into_response())
}

/// Renames a watchlist.
#[debug_handler]
async fn update(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<UpdateWatchlist>,
) -> Result<Response> {
    let user_id = auth.user.id;
    UpdateWatchlistAction::run(&ctx, user_id, id, params.name).await?;
    format::json(watchlist_page::build(&ctx, user_id, Some(id)).await?)
}

#[debug_handler]
async fn remove(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeleteWatchlistAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

/// Replaces the order of the sections and items of a watchlist.
#[debug_handler]
async fn reorder(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<ReorderWatchlist>,
) -> Result<Response> {
    let user_id = auth.user.id;
    ReorderWatchlistAction::run(&ctx, user_id, id, params.sections).await?;
    format::json(watchlist_page::build(&ctx, user_id, Some(id)).await?)
}

/// Appends a section to a watchlist (201 + page payload).
#[debug_handler]
async fn create_section(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<CreateWatchlistSection>,
) -> Result<Response> {
    let user_id = auth.user.id;
    CreateWatchlistSectionAction::run(&ctx, user_id, id, params.name).await?;
    let payload = watchlist_page::build(&ctx, user_id, Some(id)).await?;
    Ok((StatusCode::CREATED, Json(payload)).into_response())
}

/// Renames a section.
#[debug_handler]
async fn update_section(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<UpdateWatchlistSection>,
) -> Result<Response> {
    let user_id = auth.user.id;
    let section = UpdateWatchlistSectionAction::run(&ctx, user_id, id, params.name).await?;
    format::json(watchlist_page::build(&ctx, user_id, Some(section.watchlist_id)).await?)
}

/// Deletes a non-default section; its items move to the default section (204).
#[debug_handler]
async fn remove_section(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeleteWatchlistSectionAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

/// Adds (201) or moves (200) a ticker on a watchlist.
#[debug_handler]
async fn add_item(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<AddWatchlistItem>,
) -> Result<Response> {
    let status =
        AddWatchlistItemAction::run(&ctx, auth.user.id, id, params.section_id, &params.symbol)
            .await?;
    Ok((
        status.status_code(),
        Json(AddWatchlistItemResponse { status }),
    )
        .into_response())
}

#[debug_handler]
async fn remove_item(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Path(id): Path<i64>,
) -> Result<Response> {
    DeleteWatchlistItemAction::run(&ctx, auth.user.id, id).await?;
    Ok(StatusCode::NO_CONTENT.into_response())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api")
        .add("/watchlists", get(index))
        .add("/watchlists", post(create))
        .add("/watchlists/summary", get(summary))
        .add("/watchlists/history", get(history))
        .add("/watchlists/{id}", put(update))
        .add("/watchlists/{id}", delete(remove))
        .add("/watchlists/{id}/reorder", patch(reorder))
        .add("/watchlists/{id}/sections", post(create_section))
        .add("/watchlists/{id}/items", post(add_item))
        .add("/watchlist-sections/{id}", put(update_section))
        .add("/watchlist-sections/{id}", delete(remove_section))
        .add("/watchlist-items/{id}", delete(remove_item))
}
