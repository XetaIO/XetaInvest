//! `/api/statistics`: portfolio statistics of the signed-in user.
//!
//! Portfolios of other users behave as if they did not exist (404).

use loco_rs::prelude::*;
use serde::Deserialize;

use crate::controllers::http::CurrentUser;
use crate::services::statistics::{self, Scope};

/// Query string of `GET /api/statistics`.
#[derive(Debug, Deserialize)]
pub struct StatisticsParams {
    /// `all` (default) or a portfolio id.
    pub portfolio: Option<String>,
    /// Rebuild the cached payload with fresh quotes.
    #[serde(default)]
    pub refresh: bool,
}

/// Totals, allocations, movers and history (in EUR) of the requested scope.
#[debug_handler]
async fn show(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Query(params): Query<StatisticsParams>,
) -> Result<Response> {
    let scope = Scope::parse(params.portfolio.as_deref())?;
    let payload = statistics::build(&ctx, auth.user.id, scope, params.refresh).await?;
    format::json(payload)
}

pub fn routes() -> Routes {
    Routes::new().prefix("/api").add("/statistics", get(show))
}
