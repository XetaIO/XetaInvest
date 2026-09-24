//! Read model behind `GET /api/statistics`: totals, allocations, top movers and
//! a one-year value history, for all the user's portfolios or a single one.
//!
//! The whole payload is cached for 30 minutes per user and scope; `refresh`
//! rebuilds it with fresh quotes. Amounts are in EUR.

use std::cmp::Reverse;
use std::collections::{BTreeMap, HashMap};
use std::time::Duration;

use chrono::{Days, NaiveDate};
use loco_rs::prelude::*;
use rust_decimal::Decimal;

use crate::dtos::portfolios::PortfolioDto;
use crate::dtos::statistics::{
    CurrencyAllocation, HistoryPointDto, InstrumentAllocation, PortfolioAllocation,
    StatisticsAllocations, StatisticsPerformance, StatisticsResponse, StatisticsScope,
    StatisticsTotals, TypeAllocation,
};
use crate::models::_entities::{portfolio_snapshots, portfolios};
use crate::services::portfolio_calculator::percent;
use crate::services::portfolio_valuation::{self, ValuedPosition};

const CACHE_TTL: Duration = Duration::from_mins(30);
const HISTORY_DAYS: u64 = 365;
const MOVERS_LIMIT: usize = 5;
const DEFAULT_ASSET_TYPE: &str = "stock";

/// Portfolios covered by a statistics request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Scope {
    All,
    Portfolio(i64),
}

impl Scope {
    /// Parses the `portfolio` query value: absent or `all`, or a numeric id.
    ///
    /// Anything else is [`Error::NotFound`], like an unknown portfolio.
    pub fn parse(raw: Option<&str>) -> Result<Self> {
        match raw {
            None | Some("all") => Ok(Self::All),
            Some(value) if !value.is_empty() && value.bytes().all(|b| b.is_ascii_digit()) => value
                .parse()
                .map(Self::Portfolio)
                .map_err(|_| Error::NotFound),
            Some(_) => Err(Error::NotFound),
        }
    }

    fn cache_segment(self) -> String {
        match self {
            Self::All => "all".to_string(),
            Self::Portfolio(id) => id.to_string(),
        }
    }
}

/// Builds the statistics payload of `user_id` for `scope`.
///
/// A portfolio scope that is not owned by the user is [`Error::NotFound`].
/// Provider failures degrade into `quote_error`, never a 5xx.
pub async fn build(
    ctx: &AppContext,
    user_id: i64,
    scope: Scope,
    refresh: bool,
) -> Result<StatisticsResponse> {
    let rows = portfolios::Entity::list_for_user(&ctx.db, user_id).await?;
    let selected: Vec<&portfolios::Model> = match scope {
        Scope::All => rows.iter().collect(),
        Scope::Portfolio(id) => vec![
            rows.iter()
                .find(|row| row.id == id)
                .ok_or(Error::NotFound)?,
        ],
    };

    let key = format!("stats:v1:user:{user_id}:{}", scope.cache_segment());
    let mut payload = if let Some(payload) = cached(ctx, &key, refresh).await {
        payload
    } else {
        let payload = compute(ctx, scope, &selected, refresh).await?;
        if let Err(err) = ctx
            .cache
            .insert_with_expiry(&key, &payload, CACHE_TTL)
            .await
        {
            tracing::debug!(error = %err, key, "statistics cache insert skipped");
        }
        payload
    };
    payload.portfolios = rows.into_iter().map(PortfolioDto::from).collect();
    Ok(payload)
}

async fn cached(ctx: &AppContext, key: &str, refresh: bool) -> Option<StatisticsResponse> {
    if refresh {
        return None;
    }
    ctx.cache
        .get::<StatisticsResponse>(key)
        .await
        .ok()
        .flatten()
}

async fn compute(
    ctx: &AppContext,
    scope: Scope,
    selected: &[&portfolios::Model],
    refresh: bool,
) -> Result<StatisticsResponse> {
    let ids: Vec<i64> = selected.iter().map(|row| row.id).collect();
    let valuation = portfolio_valuation::value_portfolios(ctx, &ids, refresh).await?;
    let open: Vec<PositionValue> = valuation
        .positions
        .iter()
        .filter_map(PositionValue::from_valued)
        .collect();

    let by_instrument = by_instrument(&open);
    let totals = totals(&open, by_instrument.len(), selected.len());
    let performance = movers(&by_instrument);
    let by_portfolio = match scope {
        Scope::All => by_portfolio(&open, selected, totals.current_value_eur),
        Scope::Portfolio(_) => Vec::new(),
    };
    let allocations = StatisticsAllocations {
        by_currency: by_currency(&open, totals.current_value_eur),
        by_type: by_type(&open, totals.current_value_eur),
        by_instrument,
        by_portfolio,
    };

    let today = chrono::Utc::now().date_naive();
    let since = today
        .checked_sub_days(Days::new(HISTORY_DAYS))
        .unwrap_or(today);
    let snapshots = portfolio_snapshots::Entity::list_since(&ctx.db, &ids, since).await?;
    let live = HistoryPointDto {
        date: today.to_string(),
        value_eur: totals.current_value_eur,
        invested_eur: totals.invested_eur,
        pnl_eur: totals.pnl_eur,
    };
    let history = merge_history(&snapshots, live, today);

    Ok(StatisticsResponse {
        portfolios: Vec::new(),
        scope: match (scope, selected.first()) {
            (Scope::Portfolio(_), Some(row)) => StatisticsScope::Portfolio {
                id: row.id,
                name: row.name.clone(),
            },
            _ => StatisticsScope::All,
        },
        totals,
        allocations,
        performance,
        history,
        generated_at: chrono::Utc::now().to_rfc3339(),
        quote_error: valuation.quote_error,
    })
}

/// The EUR figures of one open position that the statistics aggregate.
#[derive(Debug, Clone, PartialEq, Eq)]
struct PositionValue {
    portfolio_id: i64,
    symbol: String,
    name: String,
    currency: String,
    asset_type: String,
    value_eur: Decimal,
    invested_eur: Decimal,
    pnl_eur: Decimal,
    previous_value_eur: Decimal,
}

impl PositionValue {
    /// `None` for fully sold positions, which the statistics ignore.
    fn from_valued(position: &ValuedPosition) -> Option<Self> {
        let kpis = &position.kpis;
        if kpis.quantity <= Decimal::ZERO {
            return None;
        }
        let asset_type = position
            .instrument
            .quote_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map_or_else(|| DEFAULT_ASSET_TYPE.to_string(), str::to_lowercase);
        Some(Self {
            portfolio_id: position.portfolio_id,
            symbol: kpis.instrument.symbol.clone(),
            name: kpis.instrument.name.clone(),
            currency: kpis.currency.clone(),
            asset_type,
            value_eur: kpis.current_value_eur,
            invested_eur: kpis.invested_eur,
            pnl_eur: kpis.pnl_eur,
            previous_value_eur: kpis.quantity * kpis.previous_close * kpis.fx_rate,
        })
    }
}

fn count(len: usize) -> u32 {
    u32::try_from(len).unwrap_or(u32::MAX)
}

fn totals(
    open: &[PositionValue],
    instrument_count: usize,
    portfolio_count: usize,
) -> StatisticsTotals {
    let invested: Decimal = open.iter().map(|p| p.invested_eur).sum();
    let current: Decimal = open.iter().map(|p| p.value_eur).sum();
    let previous: Decimal = open.iter().map(|p| p.previous_value_eur).sum();
    let pnl = current - invested;
    let daily = current - previous;
    StatisticsTotals {
        invested_eur: invested,
        current_value_eur: current,
        pnl_eur: pnl,
        pnl_pct: percent(pnl, invested),
        daily_change_eur: daily,
        daily_change_pct: percent(daily, previous),
        position_count: count(open.len()),
        instrument_count: count(instrument_count),
        portfolio_count: count(portfolio_count),
    }
}

/// Instruments merged across portfolios (metadata of the first occurrence),
/// largest value first.
fn by_instrument(open: &[PositionValue]) -> Vec<InstrumentAllocation> {
    let total: Decimal = open.iter().map(|p| p.value_eur).sum();
    let mut rows: Vec<InstrumentAllocation> = Vec::new();
    let mut index: HashMap<String, usize> = HashMap::new();
    for position in open {
        let slot = *index
            .entry(position.symbol.to_ascii_uppercase())
            .or_insert_with(|| {
                rows.push(InstrumentAllocation {
                    symbol: position.symbol.clone(),
                    name: position.name.clone(),
                    currency: position.currency.clone(),
                    asset_type: position.asset_type.clone(),
                    value_eur: Decimal::ZERO,
                    invested_eur: Decimal::ZERO,
                    pnl_eur: Decimal::ZERO,
                    pnl_pct: Decimal::ZERO,
                    percent: Decimal::ZERO,
                });
                rows.len() - 1
            });
        let row = &mut rows[slot];
        row.value_eur += position.value_eur;
        row.invested_eur += position.invested_eur;
        row.pnl_eur += position.pnl_eur;
    }
    for row in &mut rows {
        row.percent = percent(row.value_eur, total);
        row.pnl_pct = percent(row.pnl_eur, row.invested_eur);
    }
    rows.sort_by_key(|row| Reverse(row.value_eur));
    rows
}

/// Sums values per key in first-seen order, then sorts by value (largest first).
fn grouped<'a>(
    open: &'a [PositionValue],
    key: impl Fn(&'a PositionValue) -> &'a str,
) -> Vec<(String, Decimal)> {
    let mut groups: Vec<(String, Decimal)> = Vec::new();
    for position in open {
        let name = key(position);
        match groups.iter_mut().find(|(group, _)| group == name) {
            Some((_, value)) => *value += position.value_eur,
            None => groups.push((name.to_string(), position.value_eur)),
        }
    }
    groups.sort_by_key(|(_, value)| Reverse(*value));
    groups
}

fn by_currency(open: &[PositionValue], total: Decimal) -> Vec<CurrencyAllocation> {
    grouped(open, |p| p.currency.as_str())
        .into_iter()
        .map(|(currency, value_eur)| CurrencyAllocation {
            currency,
            value_eur,
            percent: percent(value_eur, total),
        })
        .collect()
}

fn by_type(open: &[PositionValue], total: Decimal) -> Vec<TypeAllocation> {
    grouped(open, |p| p.asset_type.as_str())
        .into_iter()
        .map(|(asset_type, value_eur)| TypeAllocation {
            asset_type,
            value_eur,
            percent: percent(value_eur, total),
        })
        .collect()
}

/// Every selected portfolio (empty ones at 0), largest value first.
fn by_portfolio(
    open: &[PositionValue],
    selected: &[&portfolios::Model],
    total: Decimal,
) -> Vec<PortfolioAllocation> {
    let mut rows: Vec<PortfolioAllocation> = selected
        .iter()
        .map(|portfolio| {
            let value_eur = open
                .iter()
                .filter(|p| p.portfolio_id == portfolio.id)
                .map(|p| p.value_eur)
                .sum();
            PortfolioAllocation {
                portfolio_id: portfolio.id,
                name: portfolio.name.clone(),
                value_eur,
                percent: percent(value_eur, total),
            }
        })
        .collect();
    rows.sort_by_key(|row| Reverse(row.value_eur));
    rows
}

/// Top gainers (P&L % > 0, best first) and losers (< 0, worst first).
fn movers(by_instrument: &[InstrumentAllocation]) -> StatisticsPerformance {
    let mut gainers: Vec<InstrumentAllocation> = by_instrument
        .iter()
        .filter(|row| row.pnl_pct > Decimal::ZERO)
        .cloned()
        .collect();
    gainers.sort_by_key(|row| Reverse(row.pnl_pct));
    gainers.truncate(MOVERS_LIMIT);

    let mut losers: Vec<InstrumentAllocation> = by_instrument
        .iter()
        .filter(|row| row.pnl_pct < Decimal::ZERO)
        .cloned()
        .collect();
    losers.sort_by_key(|row| row.pnl_pct);
    losers.truncate(MOVERS_LIMIT);

    StatisticsPerformance {
        top_gainers: gainers,
        top_losers: losers,
    }
}

/// Sums snapshots per day, replaces today's by the `live` point, oldest first.
fn merge_history(
    snapshots: &[portfolio_snapshots::Model],
    live: HistoryPointDto,
    today: NaiveDate,
) -> Vec<HistoryPointDto> {
    let mut days: BTreeMap<NaiveDate, (Decimal, Decimal, Decimal)> = BTreeMap::new();
    for snapshot in snapshots.iter().filter(|s| s.captured_on < today) {
        let day = days.entry(snapshot.captured_on).or_default();
        day.0 += snapshot.current_value_eur;
        day.1 += snapshot.invested_eur;
        day.2 += snapshot.pnl_eur;
    }
    let mut history: Vec<HistoryPointDto> = days
        .into_iter()
        .map(
            |(date, (value_eur, invested_eur, pnl_eur))| HistoryPointDto {
                date: date.to_string(),
                value_eur,
                invested_eur,
                pnl_eur,
            },
        )
        .collect();
    history.push(live);
    history
}

#[cfg(test)]
mod tests {
    use super::*;
    use rstest::rstest;

    fn dec(value: &str) -> Decimal {
        value.parse().unwrap()
    }

    fn position(portfolio_id: i64, symbol: &str, value: &str, invested: &str) -> PositionValue {
        PositionValue {
            portfolio_id,
            symbol: symbol.to_string(),
            name: format!("{symbol} Inc."),
            currency: "USD".to_string(),
            asset_type: "equity".to_string(),
            value_eur: dec(value),
            invested_eur: dec(invested),
            pnl_eur: dec(value) - dec(invested),
            previous_value_eur: dec(value),
        }
    }

    fn snapshot(
        portfolio_id: i64,
        day: NaiveDate,
        value: &str,
        invested: &str,
    ) -> portfolio_snapshots::Model {
        let now = chrono::Utc::now().into();
        portfolio_snapshots::Model {
            created_at: now,
            updated_at: now,
            id: 0,
            captured_on: day,
            invested_eur: dec(invested),
            current_value_eur: dec(value),
            pnl_eur: dec(value) - dec(invested),
            position_count: 1,
            quote_error: false,
            portfolio_id,
        }
    }

    fn live(today: NaiveDate) -> HistoryPointDto {
        HistoryPointDto {
            date: today.to_string(),
            value_eur: dec("10"),
            invested_eur: dec("8"),
            pnl_eur: dec("2"),
        }
    }

    #[rstest]
    #[case(None, Scope::All)]
    #[case(Some("all"), Scope::All)]
    #[case(Some("42"), Scope::Portfolio(42))]
    fn parses_valid_scopes(#[case] raw: Option<&str>, #[case] expected: Scope) {
        assert_eq!(Scope::parse(raw).unwrap(), expected);
    }

    #[rstest]
    #[case("")]
    #[case("-1")]
    #[case("abc")]
    #[case("ALL")]
    #[case("99999999999999999999")]
    fn rejects_invalid_scopes_as_not_found(#[case] raw: &str) {
        assert!(matches!(Scope::parse(Some(raw)), Err(Error::NotFound)));
    }

    #[test]
    fn merges_the_same_symbol_across_portfolios() {
        let rows = by_instrument(&[
            position(1, "AAPL", "100", "80"),
            position(2, "MSFT", "50", "60"),
            position(2, "AAPL", "50", "40"),
        ]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].symbol, "AAPL");
        assert_eq!(rows[0].value_eur, dec("150"));
        assert_eq!(rows[0].pnl_pct, dec("25"));
        assert_eq!(rows[0].percent, dec("75"));
        assert_eq!(rows[1].pnl_pct.round_dp(2), dec("-16.67"));
    }

    #[test]
    fn totals_include_daily_change_against_previous_close() {
        let mut first = position(1, "AAPL", "110", "100");
        first.previous_value_eur = dec("100");
        let totals = totals(&[first], 1, 3);
        assert_eq!(totals.pnl_eur, dec("10"));
        assert_eq!(totals.pnl_pct, dec("10"));
        assert_eq!(totals.daily_change_eur, dec("10"));
        assert_eq!(totals.daily_change_pct, dec("10"));
        assert_eq!((totals.position_count, totals.portfolio_count), (1, 3));
    }

    #[test]
    fn empty_totals_have_zero_percentages() {
        let totals = totals(&[], 0, 0);
        assert_eq!(totals.pnl_pct, Decimal::ZERO);
        assert_eq!(totals.daily_change_pct, Decimal::ZERO);
    }

    #[test]
    fn groups_by_currency_and_type_largest_first() {
        let mut eur = position(1, "PSP5.PA", "300", "250");
        eur.currency = "EUR".to_string();
        eur.asset_type = "etf".to_string();
        let open = [position(1, "AAPL", "100", "80"), eur];
        let currencies = by_currency(&open, dec("400"));
        assert_eq!(currencies[0].currency, "EUR");
        assert_eq!(currencies[0].percent, dec("75"));
        let types = by_type(&open, dec("400"));
        assert_eq!(types[0].asset_type, "etf");
        assert_eq!(types[1].asset_type, "equity");
    }

    #[test]
    fn movers_keep_five_strictly_positive_or_negative() {
        let open: Vec<PositionValue> = (1..=7)
            .map(|i| position(1, &format!("G{i}"), &format!("{}", 100 + i), "100"))
            .chain([
                position(1, "FLAT", "100", "100"),
                position(1, "L1", "90", "100"),
                position(1, "L2", "50", "100"),
            ])
            .collect();
        let movers = movers(&by_instrument(&open));
        let gainers: Vec<&str> = movers
            .top_gainers
            .iter()
            .map(|r| r.symbol.as_str())
            .collect();
        let losers: Vec<&str> = movers
            .top_losers
            .iter()
            .map(|r| r.symbol.as_str())
            .collect();
        assert_eq!(gainers, ["G7", "G6", "G5", "G4", "G3"]);
        assert_eq!(losers, ["L2", "L1"]);
    }

    #[test]
    fn history_without_snapshots_is_the_live_point() {
        let today = NaiveDate::from_ymd_opt(2026, 9, 24).unwrap();
        assert_eq!(merge_history(&[], live(today), today), vec![live(today)]);
    }

    #[test]
    fn history_sums_days_and_replaces_today_with_the_live_point() {
        let today = NaiveDate::from_ymd_opt(2026, 9, 24).unwrap();
        let day = NaiveDate::from_ymd_opt(2026, 5, 21).unwrap();
        let history = merge_history(
            &[
                snapshot(1, day, "1100", "1000"),
                snapshot(2, day, "600", "500"),
                snapshot(1, today, "1", "1"),
            ],
            live(today),
            today,
        );
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].date, "2026-05-21");
        assert_eq!(history[0].value_eur, dec("1700"));
        assert_eq!(history[0].invested_eur, dec("1500"));
        assert_eq!(history[0].pnl_eur, dec("200"));
        assert_eq!(history[1], live(today));
    }
}
