//! `/api/auth`: registration, email verification, password reset, and
//! cookie-based sessions (password or magic link).
//!
//! The JWT never appears in a response body: it travels only in the
//! `HttpOnly` `auth_token` cookie read by the `auth::JWT` extractors.

use loco_rs::environment::Environment;
use loco_rs::prelude::*;
use serde::Serialize;

use crate::actions::auth::{
    forgot::ForgotAction, login::LoginAction, magic_link::MagicLinkAction,
    magic_link_verify::MagicLinkVerifyAction, register::RegisterAction,
    resend_verification::ResendVerificationAction, reset_password::ResetPasswordAction,
    verify::VerifyAction,
};
use crate::dtos::auth::{EmailParams, LoginParams, RegisterParams, ResetParams};
use crate::models::_entities::users;
use crate::views::auth::{CurrentResponse, LoginResponse};

const AUTH_COOKIE_NAME: &str = "auth_token";

/// The session cookie is `Secure` in production only (local dev runs over HTTP).
fn is_secure(ctx: &AppContext) -> bool {
    matches!(ctx.environment, Environment::Production)
}

/// `HttpOnly` session cookie holding the JWT for `max_age` seconds.
fn session_cookie(value: String, max_age: time::Duration, secure: bool) -> cookie::Cookie<'static> {
    cookie::Cookie::build((AUTH_COOKIE_NAME, value))
        .http_only(true)
        .secure(secure)
        .path("/")
        .same_site(cookie::SameSite::Lax)
        .max_age(max_age)
        .build()
}

/// JSON `body` plus the session cookie for `token`.
fn json_with_session<T: Serialize>(
    ctx: &AppContext,
    token: String,
    expiration: u64,
    body: T,
) -> Result<Response> {
    let max_age = time::Duration::seconds(i64::try_from(expiration).unwrap_or(i64::MAX));
    format::render()
        .cookies(&[session_cookie(token, max_age, is_secure(ctx))])?
        .json(body)
}

/// Expired session cookie, so the browser drops it.
fn cleared_session(ctx: &AppContext) -> cookie::Cookie<'static> {
    session_cookie(String::new(), time::Duration::ZERO, is_secure(ctx))
}

/// Creates an account and sends the verification email.
///
/// Always 200 for a valid body (taken emails are not revealed); 400 when the
/// body is invalid.
#[debug_handler]
async fn register(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<RegisterParams>,
) -> Result<Response> {
    RegisterAction::run(&ctx, &params).await?;
    format::json(())
}

/// Confirms an email address (idempotent); 401 for an unknown token.
#[debug_handler]
async fn verify(State(ctx): State<AppContext>, Path(token): Path<String>) -> Result<Response> {
    VerifyAction::run(&ctx, &token).await?;
    format::json(())
}

/// Emails a password-reset token (always 200, accounts are not revealed).
#[debug_handler]
async fn forgot(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<EmailParams>,
) -> Result<Response> {
    ForgotAction::run(&ctx, &params.email).await?;
    format::json(())
}

/// Sets a new password from a reset token (always 200 for a valid body).
#[debug_handler]
async fn reset(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<ResetParams>,
) -> Result<Response> {
    ResetPasswordAction::run(&ctx, &params).await?;
    format::json(())
}

/// Logs in with email + password and sets the session cookie; 401 otherwise.
#[debug_handler]
async fn login(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<LoginParams>,
) -> Result<Response> {
    let session = LoginAction::run(&ctx, &params).await?;
    let body = LoginResponse::new(&session.user);
    json_with_session(&ctx, session.token, session.expiration, body)
}

/// The signed-in user's profile.
///
/// A valid JWT whose user no longer exists (e.g. after `db reset`) is a stale
/// session: 401 plus a cleared cookie, since the SPA treats only 401 as "guest".
#[debug_handler]
async fn current(auth: auth::JWT, State(ctx): State<AppContext>) -> Result<Response> {
    match users::Model::find_by_pid(&ctx.db, &auth.claims.pid).await {
        Ok(user) => format::json(CurrentResponse::new(&user)),
        Err(ModelError::EntityNotFound) => format::render()
            .status(401)
            .cookies(&[cleared_session(&ctx)])?
            .json(serde_json::json!({
                "error": "unauthorized",
                "description": "You do not have permission to access this resource"
            })),
        Err(err) => Err(err.into()),
    }
}

/// Ends the session: 204 plus a cleared cookie.
#[debug_handler]
async fn logout(State(ctx): State<AppContext>) -> Result<Response> {
    format::render()
        .status(204)
        .cookies(&[cleared_session(&ctx)])?
        .empty()
}

/// Emails a one-time login link (always 200 for a valid email).
#[debug_handler]
async fn magic_link(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<EmailParams>,
) -> Result<Response> {
    MagicLinkAction::run(&ctx, &params.email).await?;
    format::empty_json()
}

/// Consumes a magic link and sets the session cookie; 401 if invalid or expired.
#[debug_handler]
async fn magic_link_verify(
    State(ctx): State<AppContext>,
    Path(token): Path<String>,
) -> Result<Response> {
    let session = MagicLinkVerifyAction::run(&ctx, &token).await?;
    let body = LoginResponse::new(&session.user);
    json_with_session(&ctx, session.token, session.expiration, body)
}

/// Re-sends the verification email for an unconfirmed account (always 200).
#[debug_handler]
async fn resend_verification_email(
    State(ctx): State<AppContext>,
    JsonValidateWithMessage(params): JsonValidateWithMessage<EmailParams>,
) -> Result<Response> {
    ResendVerificationAction::run(&ctx, &params.email).await?;
    format::json(())
}

pub fn routes() -> Routes {
    Routes::new()
        .prefix("/api/auth")
        .add("/register", post(register))
        .add("/verify/{token}", get(verify))
        .add("/login", post(login))
        .add("/logout", post(logout))
        .add("/forgot", post(forgot))
        .add("/reset", post(reset))
        .add("/current", get(current))
        .add("/magic-link", post(magic_link))
        .add("/magic-link/{token}", get(magic_link_verify))
        .add("/resend-verification-mail", post(resend_verification_email))
}
