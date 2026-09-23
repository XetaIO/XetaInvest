//! Read model behind `GET /api/dashboard`: the user's portfolios plus the KPIs
//! of the active one. Quotes stay native; KPIs are converted to EUR.

use std::collections::HashMap;

use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::dtos::dashboard::{
    DashboardActive, DashboardPortfolioKpis, DashboardPortfolioSummary, DashboardResponse,
};
use crate::dtos::portfolios::PortfolioDto;
use crate::models::_entities::{instruments, portfolios, positions, transactions};
use crate::services::{finance_query, portfolio_calculator};

const QUOTES_UNAVAILABLE: &str = "Market data is temporarily unavailable.";
const FX_UNAVAILABLE: &str = "Currency conversion is temporarily unavailable.";

/// Builds the dashboard payload for the signed-in user.
///
/// `portfolio_id` selects the active portfolio when it is owned; otherwise the
/// default (then the first) portfolio is used. `refresh` bypasses the quote
/// and FX caches. Provider failures degrade into `quote_error`, never a 5xx.
pub async fn build(
    ctx: &AppContext,
    user_id: i64,
    portfolio_id: Option<i64>,
    refresh: bool,
) -> Result<DashboardResponse> {
    let rows = portfolios::Entity::list_for_user(&ctx.db, user_id).await?;

    let active = match resolve_active(&rows, portfolio_id) {
        Some(active) => {
            let (kpis, quote_error) = load_kpis(ctx, active.id, refresh).await?;
            Some(DashboardActive {
                portfolio: DashboardPortfolioSummary {
                    id: active.id,
                    name: active.name.clone(),
                    is_default: active.is_default,
                },
                kpis,
                last_updated: chrono::Utc::now().to_rfc3339(),
                quote_error,
            })
        }
        None => None,
    };

    Ok(DashboardResponse {
        portfolios: rows.into_iter().map(PortfolioDto::from).collect(),
        active,
    })
}

/// Explicit id (if owned), else the default, else the first portfolio.
fn resolve_active(
    rows: &[portfolios::Model],
    portfolio_id: Option<i64>,
) -> Option<&portfolios::Model> {
    portfolio_id
        .and_then(|id| rows.iter().find(|row| row.id == id))
        .or_else(|| rows.iter().find(|row| row.is_default))
        .or_else(|| rows.first())
}

/// Positions, quotes, FX, and KPIs of one portfolio, plus a provider error message.
async fn load_kpis(
    ctx: &AppContext,
    portfolio_id: i64,
    refresh: bool,
) -> Result<(DashboardPortfolioKpis, Option<String>)> {
    let position_rows = positions::Entity::list_for_portfolio(&ctx.db, portfolio_id).await?;
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
            tracing::warn!(error = %err, "dashboard quotes failed");
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
                tracing::warn!(error = %err, currency, "dashboard fx failed");
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
            Some(portfolio_calculator::compute_position(
                position.id,
                instrument,
                &lots.remove(&position.id).unwrap_or_default(),
                quotes.get(&instrument.symbol),
                fx_rate,
            ))
        })
        .collect();

    Ok((
        portfolio_calculator::compute_portfolio(positions),
        quote_error,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn portfolio(id: i64, is_default: bool) -> portfolios::Model {
        let now = chrono::Utc::now().into();
        portfolios::Model {
            created_at: now,
            updated_at: now,
            id,
            name: format!("P{id}"),
            is_default,
            user_id: 1,
        }
    }

    #[test]
    fn active_portfolio_prefers_owned_id_then_default_then_first() {
        let rows = [portfolio(1, false), portfolio(2, true), portfolio(3, false)];
        assert_eq!(resolve_active(&rows, Some(3)).map(|p| p.id), Some(3));
        assert_eq!(resolve_active(&rows, Some(99)).map(|p| p.id), Some(2));
        assert_eq!(resolve_active(&rows, None).map(|p| p.id), Some(2));
        assert_eq!(resolve_active(&rows[..1], None).map(|p| p.id), Some(1));
        assert!(resolve_active(&[], None).is_none());
    }
}
