use loco_rs::prelude::*;

use crate::models::_entities::positions::Entity;

pub struct DeletePositionAction;

impl DeletePositionAction {
    /// Deletes an owned position; its transactions go with it (FK cascade).
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<()> {
        let position = Entity::find_owned(&ctx.db, user_id, id)
            .await?
            .ok_or(Error::NotFound)?;
        position.delete(&ctx.db).await?;
        Ok(())
    }
}
