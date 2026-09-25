use loco_rs::prelude::*;

use crate::dtos::auth::ResetParams;
use crate::models::_entities::users;

pub struct ResetPasswordAction;

impl ResetPasswordAction {
    /// Sets a new password from a (non-expired) reset token.
    ///
    /// Unknown or expired tokens succeed silently so accounts are not revealed.
    pub async fn run(ctx: &AppContext, params: &ResetParams) -> Result<()> {
        let Ok(user) = users::Model::find_by_reset_token(&ctx.db, &params.token).await else {
            tracing::info!("reset token not found or expired");
            return Ok(());
        };
        user.into_active_model()
            .reset_password(&ctx.db, &params.password)
            .await?;
        Ok(())
    }
}
