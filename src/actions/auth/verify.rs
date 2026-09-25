use loco_rs::prelude::*;

use crate::models::_entities::users;

pub struct VerifyAction;

impl VerifyAction {
    /// Confirms an email address with the token from the welcome mail.
    ///
    /// Unknown tokens are [`Error::Unauthorized`]; verifying twice is a no-op.
    pub async fn run(ctx: &AppContext, token: &str) -> Result<()> {
        let Ok(user) = users::Model::find_by_verification_token(&ctx.db, token).await else {
            return unauthorized("invalid token");
        };

        if user.email_verified_at.is_some() {
            tracing::info!(pid = user.pid.to_string(), "user already verified");
        } else {
            let user = user.into_active_model().verified(&ctx.db).await?;
            tracing::info!(pid = user.pid.to_string(), "user verified");
        }
        Ok(())
    }
}
