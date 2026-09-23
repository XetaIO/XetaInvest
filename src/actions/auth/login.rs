use loco_rs::prelude::*;

use crate::dtos::auth::LoginParams;
use crate::models::_entities::users;

/// Same message for unknown emails and wrong passwords, so accounts cannot be probed.
const INVALID_CREDENTIALS: &str = "Invalid credentials";

pub struct LoginAction;

/// A signed session for an authenticated user.
pub struct LoginOutcome {
    pub user: users::Model,
    pub token: String,
    /// Token lifetime in seconds (also the cookie `Max-Age`).
    pub expiration: u64,
}

impl LoginAction {
    /// Checks the credentials and issues a JWT session.
    pub async fn run(ctx: &AppContext, params: &LoginParams) -> Result<LoginOutcome> {
        let Ok(user) = users::Model::find_by_email(&ctx.db, &params.email).await else {
            tracing::debug!(email = params.email, "login attempt with unknown email");
            return unauthorized(INVALID_CREDENTIALS);
        };
        if !user.verify_password(&params.password) {
            return unauthorized(INVALID_CREDENTIALS);
        }
        issue_session(ctx, user)
    }
}

/// Signs a JWT for an already-authenticated user.
pub fn issue_session(ctx: &AppContext, user: users::Model) -> Result<LoginOutcome> {
    let jwt = ctx.config.get_jwt_config()?;
    let token = user.generate_jwt(&jwt.secret, jwt.expiration)?;
    Ok(LoginOutcome {
        user,
        token,
        expiration: jwt.expiration,
    })
}
