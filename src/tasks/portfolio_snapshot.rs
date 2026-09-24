use chrono::NaiveDate;
use loco_rs::prelude::*;

use crate::actions::portfolio_snapshots::capture_portfolio_snapshot::CapturePortfolioSnapshotAction;
use crate::models::_entities::portfolios;
use crate::models::portfolio_snapshots::Model;

/// `cargo loco task portfolio:snapshot [date:YYYY-MM-DD] [portfolio:ID] [force:true]`
///
/// Captures the daily EUR snapshots (history of the statistics page) directly,
/// for one portfolio or all of them; the scheduler runs it every evening.
/// Rejects an invalid date or an unknown portfolio up front. In an all-portfolios
/// run, a failing portfolio is logged and does not stop the others, but the task
/// then exits with an error so the scheduler reports it.
pub struct PortfolioSnapshot;

/// Outcome counters of an all-portfolios run.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct SnapshotRun {
    pub captured: usize,
    pub skipped: usize,
    pub failed: usize,
}

impl SnapshotRun {
    /// Counts one portfolio: stored, skipped (no position) or failed.
    pub fn record(&mut self, outcome: &Result<Option<Model>>) {
        match outcome {
            Ok(Some(_)) => self.captured += 1,
            Ok(None) => self.skipped += 1,
            Err(_) => self.failed += 1,
        }
    }
}

#[async_trait]
impl Task for PortfolioSnapshot {
    fn task(&self) -> TaskInfo {
        TaskInfo {
            name: "portfolio:snapshot".to_string(),
            detail: "Capture daily portfolio value snapshots for the historical chart.\nUsage:\ncargo loco task portfolio:snapshot [date:2026-09-24] [portfolio:1] [force:true]".to_string(),
        }
    }

    async fn run(&self, ctx: &AppContext, vars: &task::Vars) -> Result<()> {
        let date = date_arg(vars)?;
        let portfolio_id = portfolio_arg(ctx, vars).await?;
        let force = vars
            .cli_arg("force")
            .is_ok_and(|value| value.trim() == "true");
        match portfolio_id {
            Some(id) => capture_one(ctx, id, date, force).await,
            None => capture_all(ctx, date, force).await,
        }
    }
}

/// Captures one portfolio; a portfolio without position is skipped, not failed.
async fn capture_one(ctx: &AppContext, id: i64, date: NaiveDate, force: bool) -> Result<()> {
    match CapturePortfolioSnapshotAction::run(ctx, id, date, force).await? {
        Some(snapshot) => println!(
            "Snapshot saved for portfolio #{id} on {date} (value: {} EUR).",
            snapshot.current_value_eur.round_dp(2)
        ),
        None => println!("Portfolio #{id} has no positions, skipped."),
    }
    Ok(())
}

/// Captures every portfolio, then fails when any of them failed.
async fn capture_all(ctx: &AppContext, date: NaiveDate, force: bool) -> Result<()> {
    let mut run = SnapshotRun::default();
    for id in portfolios::Entity::list_ids(&ctx.db).await? {
        let outcome = CapturePortfolioSnapshotAction::run(ctx, id, date, force).await;
        if let Err(err) = &outcome {
            tracing::error!(portfolio_id = id, date = %date, error = %err, "portfolio snapshot failed");
        }
        run.record(&outcome);
    }
    println!("Date:     {date}");
    println!("Captured: {}", run.captured);
    println!("Skipped:  {}", run.skipped);
    println!("Failed:   {}", run.failed);
    if run.failed > 0 {
        return Err(Error::string(&format!(
            "{} portfolio snapshot(s) failed on {} ({} captured, {} skipped).",
            run.failed, date, run.captured, run.skipped
        )));
    }
    Ok(())
}

/// `date:` as an ISO day, today (UTC) when omitted.
fn date_arg(vars: &task::Vars) -> Result<NaiveDate> {
    let Ok(value) = vars.cli_arg("date") else {
        return Ok(chrono::Utc::now().date_naive());
    };
    NaiveDate::parse_from_str(value.trim(), "%Y-%m-%d")
        .map_err(|_| Error::string(&format!("Invalid date value: {value}")))
}

/// `portfolio:` as the id of an existing portfolio, `None` (all) when omitted.
async fn portfolio_arg(ctx: &AppContext, vars: &task::Vars) -> Result<Option<i64>> {
    let Ok(value) = vars.cli_arg("portfolio") else {
        return Ok(None);
    };
    let not_found = || Error::string(&format!("Portfolio #{value} not found."));
    let id = value.trim().parse::<i64>().map_err(|_| not_found())?;
    portfolios::Entity::find_by_id(id)
        .one(&ctx.db)
        .await?
        .ok_or_else(not_found)?;
    Ok(Some(id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_run_counts_each_outcome() {
        let snapshot = Model {
            created_at: chrono::Utc::now().into(),
            updated_at: chrono::Utc::now().into(),
            id: 1,
            captured_on: NaiveDate::from_ymd_opt(2026, 9, 24).unwrap(),
            invested_eur: rust_decimal::Decimal::ONE,
            current_value_eur: rust_decimal::Decimal::ONE,
            pnl_eur: rust_decimal::Decimal::ZERO,
            position_count: 1,
            quote_error: false,
            portfolio_id: 1,
        };
        let mut run = SnapshotRun::default();
        run.record(&Ok(Some(snapshot.clone())));
        run.record(&Ok(Some(snapshot)));
        run.record(&Ok(None));
        run.record(&Err(Error::string("market data is unavailable")));

        assert_eq!(
            run,
            SnapshotRun {
                captured: 2,
                skipped: 1,
                failed: 1,
            }
        );
    }
}
