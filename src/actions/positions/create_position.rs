use loco_rs::prelude::*;
use sea_orm::{ActiveEnum, TransactionTrait};

use crate::dtos::positions::CreatePosition;
use crate::models::_entities::{portfolios, positions, transactions};
use crate::models::transactions::TransactionKind;
use crate::services::{finance_query, instrument_resolver};
use crate::validation::rules::{field_error, from_txn, to_iso_date};

pub struct CreatePositionAction;

impl CreatePositionAction {
    /// Adds a ticker to an owned portfolio and records each line as a buy.
    ///
    /// The symbol must have a live quote. Its instrument and the position are
    /// first-or-created, so adding a ticker twice appends lots to the same
    /// position.
    pub async fn run(
        ctx: &AppContext,
        user_id: i64,
        portfolio_id: i64,
        params: CreatePosition,
    ) -> Result<positions::Model> {
        let instrument = resolve_quoted_instrument(ctx, &params.symbol).await?;

        let mut lots = Vec::with_capacity(params.lines.len());
        for line in params.lines {
            let executed_at = to_iso_date(&line.executed_at, "executed_at")?;
            lots.push(transactions::ActiveModel {
                kind: Set(TransactionKind::Buy.to_value()),
                quantity: Set(line.quantity),
                unit_price: Set(line.unit_price),
                executed_at: Set(executed_at),
                notes: Set(line.notes),
                ..Default::default()
            });
        }

        ctx.db
            .transaction::<_, positions::Model, Error>(|txn| {
                Box::pin(async move {
                    portfolios::Entity::find_owned(txn, user_id, portfolio_id)
                        .await?
                        .ok_or(Error::NotFound)?;

                    let position =
                        match positions::Entity::find_pair(txn, portfolio_id, instrument.id).await?
                        {
                            Some(existing) => existing,
                            None => {
                                positions::ActiveModel {
                                    portfolio_id: Set(portfolio_id),
                                    instrument_id: Set(instrument.id),
                                    ..Default::default()
                                }
                                .insert(txn)
                                .await?
                            }
                        };

                    for mut lot in lots {
                        lot.position_id = Set(position.id);
                        lot.insert(txn).await?;
                    }
                    Ok(position)
                })
            })
            .await
            .map_err(from_txn)
    }
}

/// Resolves `symbol` to a persisted instrument, requiring a live quote.
///
/// Every failure (blank, unquoted, unknown, provider down) is reported as
/// "Symbol not found." on `symbol`.
async fn resolve_quoted_instrument(
    ctx: &AppContext,
    symbol: &str,
) -> Result<crate::models::_entities::instruments::Model> {
    let not_found = || field_error("symbol", "not_found", "Symbol not found.");

    let symbol = instrument_resolver::normalize_symbol(symbol).ok_or_else(not_found)?;
    if !matches!(finance_query::quote(ctx, &symbol, false).await, Ok(Some(_))) {
        return Err(not_found());
    }
    match instrument_resolver::resolve(ctx, &symbol).await {
        Ok(Some(instrument)) => Ok(instrument),
        Ok(None) => Err(not_found()),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "instrument resolve failed");
            Err(not_found())
        }
    }
}
