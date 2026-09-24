use chrono::NaiveDate;
use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::models::portfolio_snapshots::{Entity, Model, SnapshotValues};
use crate::services::{portfolio_calculator, portfolio_valuation};

pub struct CapturePortfolioSnapshotAction;

impl CapturePortfolioSnapshotAction {
    /// Values a portfolio in EUR and stores it as its snapshot of `captured_on`.
    ///
    /// Returns `None` (nothing written) for a portfolio without positions.
    /// When quotes or FX rates are unavailable, nothing is written and an
    /// error is returned. `force` bypasses the quote and FX caches.
    pub async fn run(
        ctx: &AppContext,
        portfolio_id: i64,
        captured_on: NaiveDate,
        force: bool,
    ) -> Result<Option<Model>> {
        let valuation = portfolio_valuation::value_portfolios(ctx, &[portfolio_id], force).await?;
        if valuation.positions.is_empty() {
            return Ok(None);
        }
        if let Some(reason) = valuation.quote_error {
            tracing::warn!(portfolio_id, reason, "snapshot skipped: no market data");
            return Err(Error::string(&format!(
                "Snapshot not saved for portfolio #{portfolio_id}: market data is unavailable."
            )));
        }

        let kpis = portfolio_calculator::compute_portfolio(
            valuation
                .positions
                .into_iter()
                .map(|position| position.kpis)
                .collect(),
        );
        let open_positions = kpis
            .positions
            .iter()
            .filter(|position| position.quantity > Decimal::ZERO)
            .count();
        let values = SnapshotValues {
            invested_eur: kpis.total_invested,
            current_value_eur: kpis.current_value,
            pnl_eur: kpis.pnl,
            position_count: i16::try_from(open_positions).unwrap_or(i16::MAX),
        };
        let snapshot = Entity::upsert_for_day(&ctx.db, portfolio_id, captured_on, values).await?;
        Ok(Some(snapshot))
    }
}
