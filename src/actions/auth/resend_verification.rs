use loco_rs::prelude::*;

use crate::{mailers::auth::AuthMailer, models::_entities::users};

pub struct ResendVerificationAction;

impl ResendVerificationAction {
    /// Re-sends the verification email when the account is not confirmed yet.
    ///
    /// Unknown and already-verified emails succeed without sending mail.
    pub async fn run(ctx: &AppContext, email: &str) -> Result<()> {
        let Ok(user) = users::Model::find_by_email(&ctx.db, email).await else {
            tracing::info!(email, "user not found for resend verification");
            return Ok(());
        };
        if user.email_verified_at.is_some() {
            tracing::info!(
                pid = user.pid.to_string(),
                "user already verified, skipping resend"
            );
            return Ok(());
        }

        let user = user
            .into_active_model()
            .set_email_verification_sent(&ctx.db)
            .await?;
        AuthMailer::send_welcome(ctx, &user).await?;
        tracing::info!(pid = user.pid.to_string(), "verification email re-sent");
        Ok(())
    }
}
