//! Read model behind `GET /api/symbols/{symbol}`: quote, chart, news, and
//! similar tickers, each degrading independently when the provider fails.

use loco_rs::prelude::*;

use crate::dtos::symbol::{
    CHART_RANGES, DEFAULT_CHART_RANGE, SymbolChartDto, SymbolChartResponse, SymbolPageResponse,
    SymbolRecommendationDto, normalize_chart_range,
};
use crate::services::finance_query::{self, first_symbol};

const NEWS_LIMIT: usize = 3;
const RECOMMENDATIONS_LIMIT: u32 = 5;
const QUOTE_ERROR: &str = "Impossible de récupérer la cotation pour le moment.";

/// Assembles the symbol page payload.
///
/// Quote failures become `quote_error` (HTTP 200). News and recommendations
/// fail softly. Chart is loaded for the default `1mo` window when a quote exists.
///
/// Returns JSON-ready page DTO.
pub async fn build(ctx: &AppContext, symbol: &str) -> SymbolPageResponse {
    let symbol = first_symbol(symbol).unwrap_or_else(|| symbol.trim().to_ascii_uppercase());

    let (quote, quote_error) = match finance_query::quote_detail(ctx, &symbol, false).await {
        Ok(quote) => (quote, None),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "symbol quote fetch failed");
            (None, Some(QUOTE_ERROR.to_string()))
        }
    };

    let news = match finance_query::news(ctx, &symbol).await {
        Ok(items) => items.into_iter().take(NEWS_LIMIT).collect(),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "symbol news fetch failed");
            Vec::new()
        }
    };

    let recommendations =
        match finance_query::recommendations(ctx, &symbol, RECOMMENDATIONS_LIMIT).await {
            Ok(items) => enrich_recommendations(ctx, items).await,
            Err(err) => {
                tracing::warn!(error = %err, symbol, "symbol recommendations fetch failed");
                Vec::new()
            }
        };

    let points = if quote.is_some() {
        match finance_query::chart(ctx, &symbol, DEFAULT_CHART_RANGE, false).await {
            Ok(points) => points,
            Err(err) => {
                tracing::warn!(error = %err, symbol, "symbol chart fetch failed");
                Vec::new()
            }
        }
    } else {
        Vec::new()
    };

    SymbolPageResponse {
        symbol,
        quote,
        quote_error,
        chart: SymbolChartDto {
            range: DEFAULT_CHART_RANGE.to_string(),
            points,
        },
        news,
        recommendations,
        available_ranges: CHART_RANGES
            .iter()
            .map(|range| (*range).to_string())
            .collect(),
    }
}

/// Chart-only payload for range switches.
///
/// Invalid ranges become `1mo`. Provider errors bubble so the controller can 503.
///
/// Returns chart DTO, or a market error.
pub async fn build_chart(
    ctx: &AppContext,
    symbol: &str,
    range: &str,
) -> std::result::Result<SymbolChartResponse, finance_query::MarketError> {
    let symbol = first_symbol(symbol).unwrap_or_else(|| symbol.trim().to_ascii_uppercase());
    let range = normalize_chart_range(range);
    let points = finance_query::chart(ctx, &symbol, &range, false).await?;
    Ok(SymbolChartResponse {
        symbol,
        range,
        points,
    })
}

/// Fills recommendation names from the quotes cache.
///
/// Returns same rows with `name` when a quote exists.
async fn enrich_recommendations(
    ctx: &AppContext,
    recommendations: Vec<SymbolRecommendationDto>,
) -> Vec<SymbolRecommendationDto> {
    if recommendations.is_empty() {
        return recommendations;
    }
    let csv = recommendations
        .iter()
        .map(|item| item.symbol.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let quotes = match finance_query::quotes(ctx, &csv, false).await {
        Ok(quotes) => quotes,
        Err(err) => {
            tracing::warn!(error = %err, "symbol recommendations quotes fetch failed");
            return recommendations;
        }
    };
    recommendations
        .into_iter()
        .map(|mut item| {
            if let Some(quote) = quotes.get(&item.symbol) {
                item.name = quote.name.clone();
            }
            item
        })
        .collect()
}
