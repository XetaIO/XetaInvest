use loco_rs::prelude::*;

use crate::{mailers::auth::AuthMailer, models::_entities::users};

pub struct ForgotAction;

impl ForgotAction {
    /// Emails a password-reset token.
    ///
    /// Unknown emails succeed silently so accounts are not revealed.
    pub async fn run(ctx: &AppContext, email: &str) -> Result<()> {
        let Ok(user) = users::Model::find_by_email(&ctx.db, email).await else {
            return Ok(());
        };
        let user = user
            .into_active_model()
            .set_forgot_password_sent(&ctx.db)
            .await?;
        AuthMailer::forgot_password(ctx, &user).await?;
        Ok(())
    }
}
