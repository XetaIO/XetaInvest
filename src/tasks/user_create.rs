use loco_rs::prelude::*;

use crate::dtos::auth::RegisterParams;
use crate::mailers::auth::AuthMailer;
use crate::models::_entities::users;

/// `cargo loco task user:create email:… name:… password:…`
///
/// Same rules and side effects as `POST /api/auth/register`, except that an
/// invalid input or a taken email is reported as an error.
pub struct UserCreate;

#[async_trait]
impl Task for UserCreate {
    fn task(&self) -> TaskInfo {
        TaskInfo {
            name: "user:create".to_string(),
            detail: "Create a user and send the welcome / verification email.\nUsage:\ncargo loco task user:create email:user@example.com name:\"John Doe\" password:\"securepassword\"".to_string(),
        }
    }

    async fn run(&self, ctx: &AppContext, vars: &task::Vars) -> Result<()> {
        let params = RegisterParams {
            email: required_arg(vars, "email")?,
            name: required_arg(vars, "name")?,
            password: required_arg(vars, "password")?,
        };
        validator::Validate::validate(&params)
            .map_err(|err| Error::string(&format!("Invalid user: {err}")))?;

        let user = users::Model::create_with_password(
            &ctx.db,
            &params.email,
            &params.name,
            &params.password,
        )
        .await
        .map_err(|err| Error::string(&format!("Failed to create user: {err}")))?;
        let user = user
            .into_active_model()
            .set_email_verification_sent(&ctx.db)
            .await?;
        AuthMailer::send_welcome(ctx, &user).await?;

        tracing::info!(user_pid = user.pid.to_string(), "user created via task");
        println!(
            "User created: {} <{}> (pid {})",
            user.name, user.email, user.pid
        );
        Ok(())
    }
}

fn required_arg(vars: &task::Vars, name: &str) -> Result<String> {
    vars.cli_arg(name)
        .map(|value| value.trim().to_string())
        .map_err(|_| Error::string(&format!("{name} is mandatory")))
}
