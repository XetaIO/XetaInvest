use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::models::_entities::portfolios::{Entity, Model};
use crate::validation::rules::from_txn;

pub struct SetDefaultPortfolioAction;

impl SetDefaultPortfolioAction {
    /// Makes an owned portfolio the user's only default.
    pub async fn run(ctx: &AppContext, user_id: i64, id: i64) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let portfolio = Entity::find_owned(txn, user_id, id)
                        .await?
                        .ok_or(Error::NotFound)?;
                    Entity::clear_default(txn, user_id).await?;
                    let mut item = portfolio.into_active_model();
                    item.is_default = Set(true);
                    Ok(item.update(txn).await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
