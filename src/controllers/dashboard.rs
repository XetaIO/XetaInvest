use loco_rs::prelude::*;
use serde::Deserialize;

use crate::controllers::http::CurrentUser;
use crate::services::dashboard;

/// Query string of `GET /api/dashboard`.
#[derive(Debug, Deserialize)]
pub struct DashboardParams {
    /// Active portfolio (defaults to the user's default portfolio).
    pub portfolio: Option<i64>,
    /// Bypass the quote and FX caches.
    #[serde(default)]
    pub refresh: bool,
}

/// The user's portfolios plus the KPIs (in EUR) of the active one.
#[debug_handler]
async fn show(
    auth: CurrentUser,
    State(ctx): State<AppContext>,
    Query(params): Query<DashboardParams>,
) -> Result<Response> {
    let payload = dashboard::build(&ctx, auth.user.id, params.portfolio, params.refresh).await?;
    format::json(payload)
}

pub fn routes() -> Routes {
    Routes::new().prefix("/api").add("/dashboard", get(show))
}
