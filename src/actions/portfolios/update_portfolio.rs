use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::dtos::portfolios::UpdatePortfolio;
use crate::models::_entities::portfolios::{Entity, Model};
use crate::validation::rules::{field_error, from_txn};

pub struct UpdatePortfolioAction;

impl UpdatePortfolioAction {
    /// Renames an owned portfolio and optionally makes it the default.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        id: i64,
        params: UpdatePortfolio,
    ) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let portfolio = Entity::find_owned(txn, user_id, id)
                        .await?
                        .ok_or(Error::NotFound)?;
                    if Entity::name_taken(txn, user_id, &params.name, Some(portfolio.id)).await? {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }

                    let is_default = params.is_default.unwrap_or(portfolio.is_default);
                    if is_default && !portfolio.is_default {
                        Entity::clear_default(txn, user_id).await?;
                    }

                    let mut item = portfolio.into_active_model();
                    item.name = Set(params.name);
                    item.is_default = Set(is_default);
                    Ok(item.update(txn).await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
