use std::collections::HashMap;

use crate::dtos::market::{QuoteDto, SymbolSearchResult};
use crate::dtos::symbol::{
    ChartPointDto, SymbolNewsItemDto, SymbolQuoteDto, SymbolRecommendationDto,
};
use crate::dtos::watchlists::SparkSeriesDto;

use super::MarketData;
use super::error::MarketError;
use super::mapping::{SearchHit, map_quote_fields, map_search_hit};

/// In-process fake selected by `settings.market_data.provider: mock` (request tests).
///
/// Never talks to Yahoo. Query `fail` / symbol `FAIL` simulate provider errors.
/// Quotes exist only for `AAPL`, `AAP`, `MSFT`, and `TSLA` so the resolver can
/// test "unknown ticker" (`MISSING`) and the quote-only path (`MSFT`).
pub struct MockMarketData;

const QUOTED_SYMBOLS: &[&str] = &["AAPL", "AAP", "MSFT", "TSLA"];

#[async_trait::async_trait]
impl MarketData for MockMarketData {
    /// Returns canned hits, or an upstream error for query `fail`.
    ///
    /// Returns two Apple-like hits.
    async fn search(
        &self,
        query: &str,
        _limit: u32,
        _region: &str,
    ) -> std::result::Result<Vec<SymbolSearchResult>, MarketError> {
        if query.eq_ignore_ascii_case("fail") {
            return Err(MarketError::Upstream("mock provider down".to_string()));
        }

        Ok(vec![
            map_search_hit(SearchHit {
                symbol: "AAPL".into(),
                short_name: Some("Apple Inc.".into()),
                long_name: None,
                exchange: Some("NMS".into()),
                quote_type: Some("equity".into()),
                logo_url: Some("https://example.com/aapl.png".into()),
                company_logo_url: None,
            }),
            map_search_hit(SearchHit {
                symbol: "AAP".into(),
                short_name: Some("Advance Auto Parts".into()),
                long_name: None,
                exchange: Some("NYQ".into()),
                quote_type: Some("equity".into()),
                logo_url: None,
                company_logo_url: None,
            }),
        ])
    }

    /// Returns a fake quote per symbol, or an upstream error for `FAIL`.
    ///
    /// Returns map of canned quotes (`regular_market_price` = 200).
    async fn quotes(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, QuoteDto>, MarketError> {
        if symbols.iter().any(|symbol| symbol == "FAIL") {
            return Err(MarketError::Upstream("mock provider down".to_string()));
        }

        Ok(symbols
            .iter()
            .filter(|symbol| QUOTED_SYMBOLS.contains(&symbol.as_str()))
            .map(|symbol| {
                let quote = map_quote_fields(
                    symbol.clone(),
                    Some(format!("{symbol} Inc")),
                    Some("NMS".into()),
                    Some("EQUITY".into()),
                    Some("USD".into()),
                    Some(200.0),
                    Some(1.0),
                    Some(0.5),
                    Some(199.0),
                    Some(format!(
                        "https://example.com/{}.png",
                        symbol.to_ascii_lowercase()
                    )),
                    None,
                );
                (symbol.clone(), quote)
            })
            .collect())
    }

    /// Canned rates so tests never hit Yahoo. `USD→EUR` is 0.92.
    ///
    /// Returns rate, or an upstream error when `from` is `FAIL`.
    async fn fx_rate(&self, from: &str, to: &str) -> std::result::Result<f64, MarketError> {
        if from.eq_ignore_ascii_case("FAIL") {
            return Err(MarketError::Upstream("mock provider down".to_string()));
        }
        if from.eq_ignore_ascii_case(to) {
            return Ok(1.0);
        }
        let rate = match (
            from.to_ascii_uppercase().as_str(),
            to.to_ascii_uppercase().as_str(),
        ) {
            ("USD", "EUR") => 0.92,
            ("GBP", "EUR") => 1.15,
            _ => 1.0,
        };
        Ok(rate)
    }

    /// Canned detailed quote for `AAPL` / `AAP` / `MSFT`. `FAIL` is an upstream error.
    ///
    /// Returns filled quote, `None` for unknown symbols.
    async fn quote_detail(
        &self,
        symbol: &str,
    ) -> std::result::Result<Option<SymbolQuoteDto>, MarketError> {
        fail_if_requested(symbol)?;
        if !QUOTED_SYMBOLS.contains(&symbol) {
            return Ok(None);
        }
        Ok(Some(mock_symbol_quote(symbol)))
    }

    /// Three daily candles so the SPA chart has a series. `FAIL` errors.
    ///
    /// Returns chart points, or empty for unknown symbols.
    async fn chart(
        &self,
        symbol: &str,
        _range: &str,
    ) -> std::result::Result<Vec<ChartPointDto>, MarketError> {
        fail_if_requested(symbol)?;
        if !QUOTED_SYMBOLS.contains(&symbol) {
            return Ok(Vec::new());
        }
        Ok(mock_chart_points())
    }

    /// One headline. `FAIL` errors; unknown symbols return `[]`.
    ///
    /// Returns news rows.
    async fn news(&self, symbol: &str) -> std::result::Result<Vec<SymbolNewsItemDto>, MarketError> {
        fail_if_requested(symbol)?;
        if !QUOTED_SYMBOLS.contains(&symbol) {
            return Ok(Vec::new());
        }
        Ok(vec![SymbolNewsItemDto {
            title: format!("{symbol} posts record quarter"),
            link: format!("https://example.com/news/{symbol}"),
            source: "MockWire".into(),
            image: Some("https://example.com/news.png".into()),
            time: "1 hour ago".into(),
        }])
    }

    /// Recommends `MSFT` for known tickers. `FAIL` errors.
    ///
    /// Returns similar symbols (names filled later).
    async fn recommendations(
        &self,
        symbol: &str,
        _limit: u32,
    ) -> std::result::Result<Vec<SymbolRecommendationDto>, MarketError> {
        fail_if_requested(symbol)?;
        if !QUOTED_SYMBOLS.contains(&symbol) {
            return Ok(Vec::new());
        }
        Ok(vec![SymbolRecommendationDto {
            symbol: "MSFT".into(),
            name: None,
            score: Some(12.5),
        }])
    }

    /// Canned 5m candles for quoted symbols. `FAIL` is an upstream error.
    ///
    /// Returns spark series for known symbols only.
    async fn spark(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, SparkSeriesDto>, MarketError> {
        if symbols.iter().any(|symbol| symbol == "FAIL") {
            return Err(MarketError::Upstream("mock provider down".to_string()));
        }
        Ok(symbols
            .iter()
            .filter(|symbol| QUOTED_SYMBOLS.contains(&symbol.as_str()))
            .map(|symbol| (symbol.clone(), mock_spark_series()))
            .collect())
    }
}

/// Three 5-minute closes ending at 200 (unix seconds).
///
/// Returns spark series used by watchlist history tests.
fn mock_spark_series() -> SparkSeriesDto {
    SparkSeriesDto {
        timestamps: vec![1_700_000_000, 1_700_000_300, 1_700_000_600],
        closes: vec![190.0, 195.0, 200.0],
    }
}

fn fail_if_requested(symbol: &str) -> std::result::Result<(), MarketError> {
    if symbol == "FAIL" {
        return Err(MarketError::Upstream("mock provider down".to_string()));
    }
    Ok(())
}

/// Filled Apple-like quote used by the symbol page tests.
///
/// Returns DTO with price 200 and a few stats.
fn mock_symbol_quote(symbol: &str) -> SymbolQuoteDto {
    SymbolQuoteDto {
        symbol: symbol.to_string(),
        name: Some(format!("{symbol} Inc")),
        short_name: Some(format!("{symbol} Inc")),
        exchange: Some("NMS".into()),
        exchange_name: Some("NasdaqGS".into()),
        currency: Some("USD".into()),
        currency_symbol: Some("$".into()),
        quote_type: Some("equity".into()),
        market_state: Some("REGULAR".into()),
        sector: Some("Technology".into()),
        industry: Some("Consumer Electronics".into()),
        country: Some("United States".into()),
        city: Some("Cupertino".into()),
        website: Some("https://www.apple.com".into()),
        long_business_summary: Some(format!("Mock summary for {symbol}.")),
        full_time_employees: Some(164_000.0),
        logo_url: Some(format!(
            "https://example.com/{}.png",
            symbol.to_ascii_lowercase()
        )),
        price: Some(200.0),
        change: Some(1.0),
        change_percent: Some(0.5),
        previous_close: Some(199.0),
        open: Some(199.5),
        day_high: Some(201.0),
        day_low: Some(198.0),
        volume: Some(50_000_000.0),
        avg_volume: Some(45_000_000.0),
        market_cap: Some(3_000_000_000_000.0),
        pe: Some(32.0),
        recommendation_key: Some("buy".into()),
        ..Default::default()
    }
}

/// Three unix-second candles ending at 200.
///
/// Returns chart points for the default 1mo window.
fn mock_chart_points() -> Vec<ChartPointDto> {
    vec![
        ChartPointDto {
            date: "1700000000".into(),
            close: 190.0,
            open: Some(189.0),
            high: Some(191.0),
            low: Some(188.0),
            volume: Some(1_000.0),
        },
        ChartPointDto {
            date: "1700086400".into(),
            close: 195.0,
            open: Some(194.0),
            high: Some(196.0),
            low: Some(193.0),
            volume: Some(1_100.0),
        },
        ChartPointDto {
            date: "1700172800".into(),
            close: 200.0,
            open: Some(198.0),
            high: Some(201.0),
            low: Some(197.0),
            volume: Some(1_200.0),
        },
    ]
}
