use loco_rs::prelude::*;

use crate::dtos::auth::RegisterParams;
use crate::mailers::auth::AuthMailer;
use crate::models::_entities::users;

pub struct RegisterAction;

impl RegisterAction {
    /// Creates an account and sends the welcome / verification email.
    ///
    /// A taken email still succeeds (without mail) so the endpoint cannot be
    /// used to enumerate accounts.
    pub async fn run(ctx: &AppContext, params: &RegisterParams) -> Result<()> {
        let user = match users::Model::create_with_password(
            &ctx.db,
            &params.email,
            &params.name,
            &params.password,
        )
        .await
        {
            Ok(user) => user,
            Err(err) => {
                tracing::info!(error = %err, user_email = params.email, "could not register user");
                return Ok(());
            }
        };

        let user = user
            .into_active_model()
            .set_email_verification_sent(&ctx.db)
            .await?;
        AuthMailer::send_welcome(ctx, &user).await?;
        Ok(())
    }
}
