use finance_query::streaming::{PriceUpdate, QuoteType};

use crate::dtos::market::PriceTickDto;

/// Maps a crate tick onto the SPA JSON contract.
///
/// Heartbeats and empty ids are dropped so the browser never sees them.
///
/// Returns JSON tick, or `None` to skip.
#[must_use]
pub fn map_crate_tick(update: &PriceUpdate) -> Option<PriceTickDto> {
    if update.quote_type == QuoteType::Heartbeat || update.id.trim().is_empty() {
        return None;
    }
    Some(PriceTickDto {
        id: update.id.to_ascii_uppercase(),
        price: f64::from(update.price),
        change: f64::from(update.change),
        change_percent: f64::from(update.change_percent),
        day_high: nonzero_f32(update.day_high),
        day_low: nonzero_f32(update.day_low),
        day_volume: nonzero_i64(update.day_volume),
        open_price: nonzero_f32(update.open_price),
        previous_close: nonzero_f32(update.previous_close),
        short_name: nonempty(&update.short_name),
        currency: nonempty(&update.currency),
        exchange: nonempty(&update.exchange),
        quote_type: serde_name(&update.quote_type),
        market_hours: serde_name(&update.market_hours),
        time: nonzero_i64(update.time),
    })
}

fn nonempty(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn nonzero_f32(value: f32) -> Option<f64> {
    if value == 0.0 {
        None
    } else {
        Some(f64::from(value))
    }
}

fn nonzero_i64(value: i64) -> Option<i64> {
    if value == 0 { None } else { Some(value) }
}

fn serde_name<T: serde::Serialize>(value: &T) -> Option<String> {
    serde_json::to_value(value)
        .ok()
        .and_then(|value| value.as_str().map(str::to_string))
}

#[cfg(test)]
mod tests {
    use super::*;
    use finance_query::streaming::PriceUpdate;

    #[test]
    fn drops_heartbeats_and_blank_ids() {
        let mut heartbeat = PriceUpdate {
            id: "AAPL".into(),
            ..PriceUpdate::default()
        };
        heartbeat.quote_type = QuoteType::Heartbeat;
        assert!(map_crate_tick(&heartbeat).is_none());
        assert!(map_crate_tick(&PriceUpdate::default()).is_none());
    }

    #[test]
    fn maps_equity_tick() {
        let tick = map_crate_tick(&PriceUpdate {
            id: "aapl".into(),
            price: 190.5,
            change: 1.25,
            change_percent: 0.66,
            quote_type: QuoteType::Equity,
            short_name: "Apple".into(),
            currency: "USD".into(),
            time: 1_700_000_000_000,
            ..PriceUpdate::default()
        })
        .expect("equity tick");
        assert_eq!(tick.id, "AAPL");
        assert!((tick.price - 190.5).abs() < f64::EPSILON);
        assert_eq!(tick.short_name.as_deref(), Some("Apple"));
        assert_eq!(tick.quote_type.as_deref(), Some("EQUITY"));
        assert_eq!(tick.time, Some(1_700_000_000_000));
    }
}
