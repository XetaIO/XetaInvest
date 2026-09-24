//! Live valuation of portfolio positions: rows, quotes, FX to EUR and per-position KPIs.
//!
//! Shared by the dashboard and the statistics read models. Provider failures
//! degrade into a `quote_error` message (missing quotes, FX rate of 1), never an error.

use std::collections::HashMap;

use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::dtos::dashboard::DashboardPositionKpis;
use crate::models::_entities::{instruments, positions, transactions};
use crate::services::{finance_query, portfolio_calculator};

const QUOTES_UNAVAILABLE: &str = "Market data is temporarily unavailable.";
const FX_UNAVAILABLE: &str = "Currency conversion is temporarily unavailable.";

/// One valued position, with the portfolio it belongs to and its instrument row.
#[derive(Debug, Clone)]
pub struct ValuedPosition {
    pub portfolio_id: i64,
    pub instrument: instruments::Model,
    pub kpis: DashboardPositionKpis,
}

/// Every position of the requested portfolios, plus a provider error message.
#[derive(Debug, Clone, Default)]
pub struct Valuation {
    pub positions: Vec<ValuedPosition>,
    pub quote_error: Option<String>,
}

/// Values every position of `portfolio_ids` (fully sold positions included).
///
/// `refresh` bypasses the quote and FX caches. Callers must only pass
/// portfolio ids the user owns.
pub async fn value_portfolios(
    ctx: &AppContext,
    portfolio_ids: &[i64],
    refresh: bool,
) -> Result<Valuation> {
    let position_rows = positions::Entity::list_for_portfolios(&ctx.db, portfolio_ids).await?;
    if position_rows.is_empty() {
        return Ok(Valuation::default());
    }
    let instrument_ids: Vec<i64> = position_rows.iter().map(|row| row.instrument_id).collect();
    let instruments: HashMap<i64, instruments::Model> =
        instruments::Entity::find_by_ids(&ctx.db, &instrument_ids)
            .await?
            .into_iter()
            .map(|row| (row.id, row))
            .collect();
    let position_ids: Vec<i64> = position_rows.iter().map(|row| row.id).collect();
    let mut lots = transactions::Entity::lots_by_position(&ctx.db, &position_ids).await?;

    let symbols_csv = instruments
        .values()
        .map(|row| row.symbol.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let mut quote_error = None;
    let quotes = finance_query::quotes(ctx, &symbols_csv, refresh)
        .await
        .unwrap_or_else(|err| {
            tracing::warn!(error = %err, "valuation quotes failed");
            quote_error = Some(QUOTES_UNAVAILABLE.to_string());
            HashMap::new()
        });

    let mut fx_rates: HashMap<String, Decimal> = HashMap::new();
    for currency in instruments
        .values()
        .map(instruments::Model::native_currency)
    {
        if fx_rates.contains_key(&currency) {
            continue;
        }
        let rate = finance_query::fx_rate_to_eur(ctx, &currency, refresh)
            .await
            .unwrap_or_else(|err| {
                tracing::warn!(error = %err, currency, "valuation fx failed");
                quote_error.get_or_insert_with(|| FX_UNAVAILABLE.to_string());
                Decimal::ONE
            });
        fx_rates.insert(currency, rate);
    }

    let positions = position_rows
        .iter()
        .filter_map(|position| {
            let instrument = instruments.get(&position.instrument_id)?;
            let fx_rate = fx_rates
                .get(&instrument.native_currency())
                .copied()
                .unwrap_or(Decimal::ONE);
            let kpis = portfolio_calculator::compute_position(
                position.id,
                instrument,
                &lots.remove(&position.id).unwrap_or_default(),
                quotes.get(&instrument.symbol),
                fx_rate,
            );
            Some(ValuedPosition {
                portfolio_id: position.portfolio_id,
                instrument: instrument.clone(),
                kpis,
            })
        })
        .collect();

    Ok(Valuation {
        positions,
        quote_error,
    })
}
