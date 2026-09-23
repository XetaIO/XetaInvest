use loco_rs::prelude::*;
use sea_orm::TransactionTrait;

use crate::dtos::portfolios::CreatePortfolio;
use crate::models::_entities::portfolios::{ActiveModel, Entity, Model};
use crate::models::portfolios::MAX_PER_USER;
use crate::validation::rules::{field_error, from_txn};

pub struct CreatePortfolioAction;

impl CreatePortfolioAction {
    /// Creates a portfolio owned by `user_id`.
    ///
    /// Enforces the per-user cap and a unique name. The default flag is
    /// exclusive, and the user's first portfolio is always the default.
    pub async fn run(ctx: &AppContext, user_id: i64, params: CreatePortfolio) -> Result<Model> {
        ctx.db
            .transaction::<_, Model, Error>(|txn| {
                Box::pin(async move {
                    let count = Entity::count_for_user(txn, user_id).await?;
                    if count >= MAX_PER_USER {
                        return Err(field_error(
                            "name",
                            "limit",
                            "The maximum number of portfolios has been reached.",
                        ));
                    }
                    if Entity::name_taken(txn, user_id, &params.name, None).await? {
                        return Err(field_error(
                            "name",
                            "already_taken",
                            "Name has already been taken",
                        ));
                    }

                    let is_default = params.is_default || count == 0;
                    if is_default {
                        Entity::clear_default(txn, user_id).await?;
                    }

                    Ok(ActiveModel {
                        user_id: Set(user_id),
                        name: Set(params.name),
                        is_default: Set(is_default),
                        ..Default::default()
                    }
                    .insert(txn)
                    .await?)
                })
            })
            .await
            .map_err(from_txn)
    }
}
