//! Position and portfolio KPIs, computed exactly with [`Decimal`].
//!
//! Lots stay in the instrument's native currency; sells consume buys FIFO.
//! The `fx_rate` is the native → EUR multiplier (pence scale included) and
//! portfolio totals are expressed in [`DISPLAY_CURRENCY`] only.

use rust_decimal::Decimal;

use crate::dtos::dashboard::{
    DashboardInstrument, DashboardLine, DashboardPortfolioKpis, DashboardPositionKpis,
};
use crate::dtos::market::QuoteDto;
use crate::models::_entities::instruments;
use crate::models::transactions::{Lot, TransactionKind};
use crate::services::finance_query::DISPLAY_CURRENCY;

/// A buy lot and what is left of it after FIFO sells.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenLine {
    pub lot: Lot,
    pub remaining_quantity: Decimal,
}

impl OpenLine {
    /// Cost basis of the remaining quantity.
    #[must_use]
    pub fn invested(&self) -> Decimal {
        self.remaining_quantity * self.lot.unit_price
    }
}

/// The result of replaying a position's lots in execution order.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Holding {
    /// Every buy, including the ones fully consumed by sells.
    pub lines: Vec<OpenLine>,
    /// Realized P&L of the sells, in native currency.
    pub realized: Decimal,
}

impl Holding {
    /// Replays `lots` (execution order): buys open lines, sells consume them FIFO.
    ///
    /// Oversells are ignored here; [`crate::services::transaction_inventory`]
    /// rejects them before they are persisted.
    #[must_use]
    pub fn from_lots(lots: &[Lot]) -> Self {
        let mut holding = Self::default();
        for lot in lots {
            match lot.kind {
                TransactionKind::Buy => holding.lines.push(OpenLine {
                    lot: lot.clone(),
                    remaining_quantity: lot.quantity,
                }),
                TransactionKind::Sell => holding.consume(lot.quantity, lot.unit_price),
            }
        }
        holding
    }

    fn consume(&mut self, quantity: Decimal, sell_price: Decimal) {
        let mut to_sell = quantity;
        for line in &mut self.lines {
            if to_sell <= Decimal::ZERO {
                break;
            }
            let consumed = line.remaining_quantity.min(to_sell);
            if consumed <= Decimal::ZERO {
                continue;
            }
            self.realized += (sell_price - line.lot.unit_price) * consumed;
            line.remaining_quantity -= consumed;
            to_sell -= consumed;
        }
    }

    /// Open quantity.
    #[must_use]
    pub fn quantity(&self) -> Decimal {
        self.lines.iter().map(|line| line.remaining_quantity).sum()
    }

    /// Cost basis of the open quantity.
    #[must_use]
    pub fn invested(&self) -> Decimal {
        self.lines.iter().map(OpenLine::invested).sum()
    }

    /// Weighted average cost of the open quantity (`0` when flat).
    #[must_use]
    pub fn average_cost(&self) -> Decimal {
        ratio(self.invested(), self.quantity())
    }
}

/// Computes the KPIs of one position (native currency + EUR conversions).
///
/// Without a quote, the market value is zero and the previous close falls
/// back to the price.
#[must_use]
pub fn compute_position(
    position_id: i64,
    instrument: &instruments::Model,
    lots: &[Lot],
    quote: Option<&QuoteDto>,
    fx_rate: Decimal,
) -> DashboardPositionKpis {
    let price = quote
        .and_then(|q| q.regular_market_price)
        .map_or(Decimal::ZERO, decimal_or_zero);
    let previous_close = quote
        .and_then(|q| q.regular_market_previous_close)
        .map_or(price, decimal_or_zero);

    let holding = Holding::from_lots(lots);
    let quantity = holding.quantity();
    let invested = holding.invested();
    let current_value = quantity * price;
    let pnl = current_value - invested;
    let daily_change = quantity * (price - previous_close);
    let currency = instrument.native_currency();

    DashboardPositionKpis {
        position_id,
        instrument: DashboardInstrument {
            id: instrument.id,
            symbol: instrument.symbol.clone(),
            name: instrument.name.clone(),
            currency: currency.clone(),
            exchange: instrument.exchange.clone(),
            logo_url: quote.and_then(|q| q.logo_url.clone()),
        },
        quantity,
        avg_cost: holding.average_cost(),
        invested,
        current_value,
        pnl,
        pnl_pct: percent(pnl, invested),
        daily_change,
        daily_change_pct: percent(daily_change, quantity * previous_close),
        currency,
        fx_rate,
        invested_eur: invested * fx_rate,
        current_value_eur: current_value * fx_rate,
        pnl_eur: pnl * fx_rate,
        daily_change_eur: daily_change * fx_rate,
        realized_pnl_eur: holding.realized * fx_rate,
        price,
        previous_close,
        realized_pnl: holding.realized,
        lines: holding
            .lines
            .iter()
            .map(|line| line_kpis(line, price))
            .collect(),
    }
}

/// Aggregates position KPIs into [`DISPLAY_CURRENCY`] portfolio totals.
#[must_use]
pub fn compute_portfolio(positions: Vec<DashboardPositionKpis>) -> DashboardPortfolioKpis {
    let total_invested: Decimal = positions.iter().map(|p| p.invested_eur).sum();
    let current_value: Decimal = positions.iter().map(|p| p.current_value_eur).sum();
    let total_previous: Decimal = positions
        .iter()
        .map(|p| p.quantity * p.previous_close * p.fx_rate)
        .sum();

    let pnl = current_value - total_invested;
    let daily_change = current_value - total_previous;

    DashboardPortfolioKpis {
        total_invested,
        current_value,
        pnl,
        pnl_pct: percent(pnl, total_invested),
        daily_change,
        daily_change_pct: percent(daily_change, total_previous),
        display_currency: DISPLAY_CURRENCY.to_string(),
        positions,
    }
}

fn line_kpis(line: &OpenLine, price: Decimal) -> DashboardLine {
    let invested = line.invested();
    let current_value = line.remaining_quantity * price;
    let pnl = current_value - invested;
    DashboardLine {
        transaction_id: line.lot.transaction_id,
        executed_at: line.lot.executed_at.to_string(),
        original_quantity: line.lot.quantity,
        remaining_quantity: line.remaining_quantity,
        unit_price: line.lot.unit_price,
        invested,
        current_value,
        pnl,
        pnl_pct: percent(pnl, invested),
    }
}

/// Provider prices arrive as `f64`; non-finite values count as missing.
fn decimal_or_zero(value: f64) -> Decimal {
    Decimal::try_from(value).unwrap_or(Decimal::ZERO)
}

/// `part / base`, or `0` when the base is not positive.
fn ratio(part: Decimal, base: Decimal) -> Decimal {
    if base > Decimal::ZERO {
        part / base
    } else {
        Decimal::ZERO
    }
}

/// `part / base * 100`, or `0` when the base is not positive.
fn percent(part: Decimal, base: Decimal) -> Decimal {
    ratio(part, base) * Decimal::ONE_HUNDRED
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use sea_orm::prelude::DateTimeWithTimeZone;

    fn ts() -> DateTimeWithTimeZone {
        chrono::Utc::now().into()
    }

    fn dec(value: &str) -> Decimal {
        value.parse().expect("decimal literal")
    }

    fn instrument(currency: &str) -> instruments::Model {
        instruments::Model {
            created_at: ts(),
            updated_at: ts(),
            id: 1,
            symbol: "AAPL".to_string(),
            name: "Apple".to_string(),
            exchange: Some("NMS".into()),
            quote_type: Some("equity".into()),
            currency: currency.into(),
            last_synced_at: None,
        }
    }

    fn lot(id: i64, kind: TransactionKind, quantity: &str, price: &str, day: u32) -> Lot {
        Lot {
            transaction_id: id,
            kind,
            quantity: dec(quantity),
            unit_price: dec(price),
            executed_at: NaiveDate::from_ymd_opt(2026, 1, day).unwrap(),
        }
    }

    fn quote(price: f64, previous: f64) -> QuoteDto {
        QuoteDto {
            symbol: "AAPL".into(),
            name: None,
            exchange: None,
            quote_type: None,
            currency: Some("USD".into()),
            regular_market_price: Some(price),
            regular_market_change: None,
            regular_market_change_percent: None,
            regular_market_previous_close: Some(previous),
            logo_url: None,
        }
    }

    #[test]
    fn buy_only_wac_and_current_value() {
        let lots = [
            lot(1, TransactionKind::Buy, "10", "100", 15),
            lot(2, TransactionKind::Buy, "10", "120", 16),
        ];
        let quote = quote(130.0, 125.0);
        let kpis = compute_position(7, &instrument("USD"), &lots, Some(&quote), Decimal::ONE);
        assert_eq!(kpis.position_id, 7);
        assert_eq!(kpis.quantity, dec("20"));
        assert_eq!(kpis.avg_cost, dec("110"));
        assert_eq!(kpis.invested, dec("2200"));
        assert_eq!(kpis.current_value, dec("2600"));
        assert_eq!(kpis.pnl, dec("400"));
        assert_eq!(kpis.daily_change, dec("100"));
    }

    #[test]
    fn fifo_partial_sell() {
        let lots = [
            lot(1, TransactionKind::Buy, "10", "100", 15),
            lot(2, TransactionKind::Buy, "10", "150", 16),
            lot(3, TransactionKind::Sell, "12", "200", 17),
        ];
        let quote = quote(180.0, 180.0);
        let kpis = compute_position(1, &instrument("USD"), &lots, Some(&quote), Decimal::ONE);
        assert_eq!(kpis.quantity, dec("8"));
        assert_eq!(kpis.realized_pnl, dec("1100"));
        assert_eq!(kpis.invested, dec("1200"));
        assert_eq!(kpis.lines[0].remaining_quantity, Decimal::ZERO);
        assert_eq!(kpis.lines[1].remaining_quantity, dec("8"));
    }

    #[test]
    fn fractional_amounts_stay_exact() {
        let lots = [
            lot(1, TransactionKind::Buy, "0.1", "0.2", 1),
            lot(2, TransactionKind::Buy, "0.2", "0.1", 2),
            lot(3, TransactionKind::Sell, "0.3", "0.3", 3),
        ];
        let holding = Holding::from_lots(&lots);
        assert_eq!(holding.quantity(), Decimal::ZERO);
        assert_eq!(holding.invested(), Decimal::ZERO);
        // (0.3 - 0.2) * 0.1 + (0.3 - 0.1) * 0.2 = 0.05 exactly.
        assert_eq!(holding.realized, dec("0.05"));
    }

    #[test]
    fn missing_quote_zeros_market_value() {
        let lots = [lot(1, TransactionKind::Buy, "1", "100", 1)];
        let kpis = compute_position(1, &instrument("USD"), &lots, None, Decimal::ONE);
        let portfolio = compute_portfolio(vec![kpis]);
        assert_eq!(portfolio.current_value, Decimal::ZERO);
        assert_eq!(portfolio.total_invested, dec("100"));
        assert_eq!(portfolio.display_currency, "EUR");
    }

    #[test]
    fn converts_native_usd_to_eur() {
        let lots = [lot(1, TransactionKind::Buy, "1", "100", 1)];
        let quote = quote(110.0, 100.0);
        let kpis = compute_position(1, &instrument("USD"), &lots, Some(&quote), dec("0.9"));
        assert_eq!(kpis.invested_eur, dec("90"));
        assert_eq!(kpis.current_value_eur, dec("99"));
        assert_eq!(kpis.pnl_eur, dec("9"));
        let portfolio = compute_portfolio(vec![kpis]);
        assert_eq!(portfolio.total_invested, dec("90"));
        assert_eq!(portfolio.current_value, dec("99"));
        assert_eq!(portfolio.pnl_pct, dec("10"));
    }

    #[test]
    fn pence_quoted_instrument_uses_the_scaled_rate() {
        // 10 shares bought at 250 GBX; GBP→EUR 1.2, so 1 GBX = 0.012 EUR.
        let lots = [lot(1, TransactionKind::Buy, "10", "250", 1)];
        let kpis = compute_position(1, &instrument("GBX"), &lots, None, dec("0.012"));
        assert_eq!(kpis.currency, "GBX");
        assert_eq!(kpis.invested, dec("2500"));
        assert_eq!(kpis.invested_eur, dec("30"));
    }

    #[test]
    fn percent_of_empty_base_is_zero() {
        assert_eq!(percent(dec("5"), Decimal::ZERO), Decimal::ZERO);
        assert_eq!(Holding::default().average_cost(), Decimal::ZERO);
    }
}
