//! HTTP helpers shared by the controllers.

use axum::http::StatusCode;
use loco_rs::controller::ErrorDetail;
use loco_rs::prelude::*;

use crate::models::users;

/// The authenticated user, loaded from the `auth_token` cookie (401 when the
/// token is missing, invalid, or its user no longer exists).
pub type CurrentUser = auth::JWTWithUser<users::Model>;

/// 503 `market_data_unavailable`, for when the market-data provider is down.
#[must_use]
pub fn market_data_unavailable() -> Error {
    Error::CustomError(
        StatusCode::SERVICE_UNAVAILABLE,
        ErrorDetail {
            error: Some("market_data_unavailable".into()),
            description: Some("Market data is temporarily unavailable.".into()),
            errors: None,
        },
    )
}
