use loco_rs::prelude::*;
use serde::Deserialize;

use crate::{dtos::market::SymbolSearchResponse, services::finance_query};

/// Query string for `GET /api/symbol-search`.
#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: Option<String>,
    pub region: Option<String>,
    pub limit: Option<u32>,
}

/// Searches instruments by name or ticker.
///
/// Auth required (cookie JWT). Queries shorter than 2 characters return
/// `{ "data": [] }` without calling the provider. Provider errors also
/// return an empty list.
///
/// Returns JSON `{ data: SymbolSearchResult[] }`.
#[debug_handler]
async fn search(
    _auth: auth::JWT,
    State(ctx): State<AppContext>,
    Query(params): Query<SearchParams>,
) -> Result<Response> {
    let query = params.q.unwrap_or_default();
    let results =
        match finance_query::search(&ctx, &query, params.limit, params.region.as_deref()).await {
            Ok(results) => results,
            Err(err) => {
                tracing::warn!(error = %err, query, "symbol search provider failed");
                Vec::new()
            }
        };

    format::json(SymbolSearchResponse { data: results })
}

/// Registers `GET /api/symbol-search`.
///
/// Returns routes for the symbol-search module.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api")
        .add("/symbol-search", get(search))
}
