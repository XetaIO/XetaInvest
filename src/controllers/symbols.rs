use loco_rs::prelude::*;
use serde::Deserialize;

use crate::{controllers::http, services::symbol_page};

/// Query string for `GET /api/symbols/{symbol}/chart`.
#[derive(Debug, Deserialize)]
pub struct ChartParams {
    pub range: Option<String>,
}

/// Loads quote, default chart, news, and similar symbols.
///
/// Auth required. Quote provider failures are returned as `quote_error` with
/// HTTP 200. Unknown tickers have `quote: null`.
///
/// Returns JSON [`SymbolPageResponse`].
#[debug_handler]
async fn show(
    _auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(symbol): Path<String>,
) -> Result<Response> {
    format::json(symbol_page::build(&ctx, &symbol).await)
}

/// Reloads one chart window (range buttons on the symbol page).
///
/// Invalid `range` values become `1mo`. Provider errors are HTTP 503.
///
/// Returns JSON [`SymbolChartResponse`], or 503.
#[debug_handler]
async fn chart(
    _auth: auth::JWT,
    State(ctx): State<AppContext>,
    Path(symbol): Path<String>,
    Query(params): Query<ChartParams>,
) -> Result<Response> {
    let range = params.range.unwrap_or_default();
    match symbol_page::build_chart(&ctx, &symbol, &range).await {
        Ok(payload) => format::json(payload),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "symbol chart provider failed");
            Err(http::market_data_unavailable())
        }
    }
}

/// Registers `GET /api/symbols/{symbol}` and `/chart`.
///
/// Returns routes for the symbols module.
pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/symbols")
        .add("/{symbol}", get(show))
        .add("/{symbol}/chart", get(chart))
}
