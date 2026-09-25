use loco_rs::prelude::*;

use crate::actions::auth::login::{LoginOutcome, issue_session};
use crate::models::_entities::users;

pub struct MagicLinkVerifyAction;

impl MagicLinkVerifyAction {
    /// Consumes a (non-expired) magic-link token and issues a JWT session.
    pub async fn run(ctx: &AppContext, token: &str) -> Result<LoginOutcome> {
        let Ok(user) = users::Model::find_by_magic_token(&ctx.db, token).await else {
            return unauthorized("invalid or expired magic link");
        };
        let user = user.into_active_model().clear_magic_link(&ctx.db).await?;
        issue_session(ctx, user)
    }
}
