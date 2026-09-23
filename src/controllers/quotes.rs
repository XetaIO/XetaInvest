use loco_rs::prelude::*;
use serde::Deserialize;

use crate::{controllers::http, dtos::market::QuotesResponse, services::finance_query};

/// Query string for `GET /api/quotes`.
#[derive(Debug, Deserialize)]
pub struct QuotesParams {
    pub symbols: Option<String>,
    pub refresh: Option<bool>,
}

/// Fetches a batch of quotes.
///
/// Auth required. `symbols` is a comma-separated list (max 50). `refresh=true`
/// bypasses the per-symbol cache.
///
/// Returns JSON `{ quotes, fetched_at }`, or 503 if the provider fails.
#[debug_handler]
async fn quotes(
    _auth: auth::JWT,
    State(ctx): State<AppContext>,
    Query(params): Query<QuotesParams>,
) -> Result<Response> {
    let symbols = params.symbols.unwrap_or_default();
    let force = params.refresh.unwrap_or(false);

    match finance_query::quotes(&ctx, &symbols, force).await {
        Ok(quotes) => format::json(QuotesResponse {
            quotes,
            fetched_at: chrono::Utc::now().to_rfc3339(),
        }),
        Err(err) => {
            tracing::warn!(error = %err, "quote provider failed");
            Err(http::market_data_unavailable())
        }
    }
}

/// Registers `GET /api/quotes`.
///
/// Returns routes for the quotes module.
pub fn routes() -> Routes {
    Routes::new().prefix("/api").add("/quotes", get(quotes))
}
