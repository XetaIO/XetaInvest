use loco_rs::prelude::*;

use crate::{mailers::auth::AuthMailer, models::_entities::users};

pub struct MagicLinkAction;

impl MagicLinkAction {
    /// Emails a one-time login link to `email`.
    ///
    /// Unknown emails succeed silently so the endpoint cannot be used to
    /// enumerate accounts.
    pub async fn run(ctx: &AppContext, email: &str) -> Result<()> {
        let Ok(user) = users::Model::find_by_email(&ctx.db, email).await else {
            tracing::debug!(email, "magic link requested for unknown email");
            return Ok(());
        };

        let user = user.into_active_model().create_magic_link(&ctx.db).await?;
        AuthMailer::send_magic_link(ctx, &user).await?;
        Ok(())
    }
}
