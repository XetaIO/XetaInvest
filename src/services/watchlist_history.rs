//! Intraday spark lines for the tickers on a user's watchlists.

use std::collections::{HashMap, HashSet};

use loco_rs::prelude::*;

use crate::dtos::watchlists::{SparkPointDto, SparkSeriesDto};
use crate::models::_entities::watchlist_items;
use crate::services::finance_query;

/// Max tickers per history request.
pub const MAX_SYMBOLS: usize = 25;

/// Spark points keyed by ticker, limited to tickers on the user's watchlists.
///
/// Foreign or unknown tickers are silently dropped, and a provider failure
/// yields an empty map: the sparklines are decorative.
pub async fn build(
    ctx: &AppContext,
    user_id: i64,
    symbols_csv: &str,
) -> Result<HashMap<String, Vec<SparkPointDto>>> {
    let mut symbols = finance_query::parse_symbols(symbols_csv);
    symbols.truncate(MAX_SYMBOLS);
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    let owned: HashSet<String> = watchlist_items::Entity::symbols_for_user(&ctx.db, user_id)
        .await?
        .into_iter()
        .collect();
    symbols.retain(|symbol| owned.contains(symbol));
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    match finance_query::spark(ctx, &symbols, false).await {
        Ok(series) => Ok(series
            .into_iter()
            .map(|(symbol, series)| (symbol, spark_points(&series)))
            .collect()),
        Err(err) => {
            tracing::warn!(error = %err, "watchlist spark provider failed");
            Ok(HashMap::new())
        }
    }
}

/// Pairs closes with their timestamps (seconds → milliseconds).
fn spark_points(series: &SparkSeriesDto) -> Vec<SparkPointDto> {
    series
        .timestamps
        .iter()
        .zip(&series.closes)
        .map(|(timestamp, close)| SparkPointDto {
            t: timestamp * 1000,
            v: *close,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spark_points_pair_closes_with_millisecond_timestamps() {
        let points = spark_points(&SparkSeriesDto {
            closes: vec![1.0, 2.0, 3.0],
            timestamps: vec![10, 20],
        });
        assert_eq!(points.len(), 2);
        assert_eq!(points[1].t, 20_000);
        assert!((points[1].v - 2.0).abs() < f64::EPSILON);
    }
}
