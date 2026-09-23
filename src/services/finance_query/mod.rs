//! Market data (search, quotes, FX, charts, news) behind the [`MarketData`]
//! abstraction, with per-kind cache TTLs.
//!
//! The provider is chosen by `settings.market_data.provider`: the
//! `finance-query` crate in process (`live`) or deterministic fixtures
//! (`mock`, used by the request tests so they never hit Yahoo). Cache keys keep
//! the `fq:*` format of the `XetaInvest` PHP app.

mod error;
mod live;
mod mapping;
mod mock;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use loco_rs::prelude::*;
use rust_decimal::Decimal;
use serde::Deserialize;

use crate::dtos::market::{QuoteDto, SymbolSearchResult};
use crate::dtos::symbol::{
    ChartPointDto, SymbolNewsItemDto, SymbolQuoteDto, SymbolRecommendationDto,
};
use crate::dtos::watchlists::SparkSeriesDto;
use crate::models::instruments::FALLBACK_CURRENCY;

pub use error::MarketError;
pub use mapping::{
    SearchHit, first_symbol, map_quote_fields, map_search_hit, normalize_limit,
    normalize_search_query, parse_symbols,
};

const SEARCH_TTL: Duration = Duration::from_secs(60);
const QUOTE_TTL: Duration = Duration::from_secs(60);
const FX_TTL: Duration = Duration::from_secs(300);
const NEWS_TTL: Duration = Duration::from_mins(15);

/// Display / aggregation currency.
pub const DISPLAY_CURRENCY: &str = "EUR";

/// Upstream market-data operations our app actually uses.
///
/// A trait (like a PHP interface) so tests can inject [`mock::MockMarketData`]
/// instead of calling the crate.
#[async_trait::async_trait]
pub trait MarketData: Send + Sync {
    /// Looks up symbols by name or ticker.
    ///
    /// Returns mapped search hits, or [`MarketError::Upstream`] if the provider fails.
    async fn search(
        &self,
        query: &str,
        limit: u32,
        region: &str,
    ) -> std::result::Result<Vec<SymbolSearchResult>, MarketError>;

    /// Fetches a batch of quotes.
    ///
    /// Returns map keyed by symbol. Missing symbols are omitted, not errors.
    async fn quotes(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, QuoteDto>, MarketError>;

    /// Exchange rate: 1 unit of `from` in `to`.
    ///
    /// Returns positive rate, or [`MarketError::Upstream`] if missing.
    async fn fx_rate(&self, from: &str, to: &str) -> std::result::Result<f64, MarketError>;

    /// Full quote used by the symbol page.
    ///
    /// Returns detailed quote, or `None` if the provider has no row.
    async fn quote_detail(
        &self,
        symbol: &str,
    ) -> std::result::Result<Option<SymbolQuoteDto>, MarketError>;

    /// OHLCV series for one chart window.
    ///
    /// Returns close-series points (possibly empty).
    async fn chart(
        &self,
        symbol: &str,
        range: &str,
    ) -> std::result::Result<Vec<ChartPointDto>, MarketError>;

    /// Recent headlines for a ticker.
    ///
    /// Returns articles, newest first.
    async fn news(&self, symbol: &str) -> std::result::Result<Vec<SymbolNewsItemDto>, MarketError>;

    /// Similar tickers.
    ///
    /// Returns symbol + score pairs (names filled later).
    async fn recommendations(
        &self,
        symbol: &str,
        limit: u32,
    ) -> std::result::Result<Vec<SymbolRecommendationDto>, MarketError>;

    /// Batch sparkline series (5m bars over 1d).
    ///
    /// Returns map keyed by symbol. Missing / empty series are omitted.
    async fn spark(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, SparkSeriesDto>, MarketError>;
}

/// Which [`MarketData`] implementation the app uses (`settings.market_data.provider`).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    /// Yahoo Finance through the `finance-query` crate.
    #[default]
    Live,
    /// Deterministic in-process fixtures (request tests, offline development).
    Mock,
}

/// `settings.market_data` in the environment config.
#[derive(Debug, Clone, Default, Deserialize)]
pub struct MarketDataSettings {
    #[serde(default)]
    pub provider: Provider,
}

impl MarketDataSettings {
    /// Reads `settings.market_data` (all fields default when absent).
    pub fn from_config(config: &loco_rs::config::Config) -> Result<Self> {
        let Some(section) = config
            .settings
            .as_ref()
            .and_then(|settings| settings.get("market_data"))
        else {
            return Ok(Self::default());
        };
        serde_json::from_value(section.clone())
            .map_err(|err| Error::string(&format!("invalid settings.market_data: {err}")))
    }
}

/// The market-data provider shared through `ctx.shared_store`.
///
/// Registered at boot by [`crate::initializers::market_data`]; services only
/// see the [`MarketData`] abstraction.
#[derive(Clone)]
pub struct MarketDataClient(Arc<dyn MarketData>);

impl MarketDataClient {
    #[must_use]
    pub fn new(provider: Provider) -> Self {
        match provider {
            Provider::Live => Self(Arc::new(live::CrateMarketData)),
            Provider::Mock => Self(Arc::new(mock::MockMarketData)),
        }
    }
}

impl std::ops::Deref for MarketDataClient {
    type Target = dyn MarketData;

    fn deref(&self) -> &Self::Target {
        self.0.as_ref()
    }
}

/// The provider registered in the app context.
///
/// # Errors
///
/// [`MarketError::Upstream`] when no provider was registered at boot.
pub fn client(ctx: &AppContext) -> std::result::Result<MarketDataClient, MarketError> {
    ctx.shared_store
        .get::<MarketDataClient>()
        .ok_or_else(|| MarketError::Upstream("market data provider is not registered".into()))
}

/// Search cache key, `fq:search:{q}:{limit}:{region}`.
///
/// Returns cache key.
#[must_use]
pub fn search_cache_key(query: &str, limit: u32, region: &str) -> String {
    format!(
        "fq:search:{}:{limit}:{}",
        query.to_ascii_lowercase(),
        region.to_ascii_lowercase()
    )
}

/// Per-symbol quote cache key, `fq:quote:{symbol}`.
///
/// Returns cache key.
#[must_use]
pub fn quote_cache_key(symbol: &str) -> String {
    format!("fq:quote:{symbol}")
}

/// FX cache key, `fq:fx:{from}{to}`.
///
/// Returns cache key.
#[must_use]
pub fn fx_cache_key(from: &str, to: &str) -> String {
    format!("fq:fx:{from}{to}")
}

/// Maps pence-quoted currencies onto their major currency plus a scale.
///
/// `GBX` is quoted in pence: 1 GBX = 0.01 GBP, then GBP → EUR. The result
/// satisfies `native * scale * fx(major, EUR) = EUR`.
#[must_use]
pub fn fx_basis(currency: &str) -> (String, Decimal) {
    let code = currency.trim().to_ascii_uppercase();
    match code.as_str() {
        "GBX" => ("GBP".to_string(), Decimal::new(1, 2)),
        "" => (FALLBACK_CURRENCY.to_string(), Decimal::ONE),
        _ => (code, Decimal::ONE),
    }
}

/// Searches symbols, with a 60s cache. Short / empty queries return `[]`
/// without calling the provider.
///
/// Provider failures are returned as [`MarketError`] so the controller can
/// answer with an empty list instead of a 500.
///
/// Returns mapped hits, possibly empty.
pub async fn search(
    ctx: &AppContext,
    query: &str,
    limit: Option<u32>,
    region: Option<&str>,
) -> std::result::Result<Vec<SymbolSearchResult>, MarketError> {
    let Some(query) = normalize_search_query(query) else {
        return Ok(Vec::new());
    };
    let limit = normalize_limit(limit);
    let region = region.unwrap_or("FR");
    let key = search_cache_key(&query, limit, region);

    if let Ok(Some(cached)) = ctx.cache.get::<Vec<SymbolSearchResult>>(&key).await {
        return Ok(cached);
    }

    let results = client(ctx)?.search(&query, limit, region).await?;
    if let Err(err) = ctx
        .cache
        .insert_with_expiry(&key, &results, SEARCH_TTL)
        .await
    {
        tracing::debug!(error = %err, key, "search cache insert skipped");
    }
    Ok(results)
}

/// Fetches quotes for a comma-separated list, with a 60s per-symbol cache.
///
/// Returns map of symbol → quote. Unknown symbols are omitted.
pub async fn quotes(
    ctx: &AppContext,
    symbols_csv: &str,
    force: bool,
) -> std::result::Result<HashMap<String, QuoteDto>, MarketError> {
    let symbols = parse_symbols(symbols_csv);
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    let mut result = HashMap::new();
    let mut to_fetch = Vec::new();

    for symbol in &symbols {
        if !force
            && let Ok(Some(cached)) = ctx.cache.get::<QuoteDto>(&quote_cache_key(symbol)).await
        {
            result.insert(symbol.clone(), cached);
            continue;
        }
        to_fetch.push(symbol.clone());
    }

    if to_fetch.is_empty() {
        return Ok(result);
    }

    let fetched = client(ctx)?.quotes(&to_fetch).await?;
    for (symbol, quote) in fetched {
        if let Err(err) = ctx
            .cache
            .insert_with_expiry(&quote_cache_key(&symbol), &quote, QUOTE_TTL)
            .await
        {
            tracing::debug!(error = %err, symbol, "quote cache insert skipped");
        }
        result.insert(symbol, quote);
    }

    Ok(result)
}

/// Fetches one quote (thin wrapper over [`quotes`]).
///
/// Returns the quote, or `None` if the provider omitted the symbol.
pub async fn quote(
    ctx: &AppContext,
    symbol: &str,
    force: bool,
) -> std::result::Result<Option<QuoteDto>, MarketError> {
    let Some(symbol) = first_symbol(symbol) else {
        return Ok(None);
    };
    let mut fetched = quotes(ctx, &symbol, force).await?;
    Ok(fetched.remove(&symbol))
}

/// Rate to convert 1 `from` into `to`, cached 5 minutes.
///
/// Same-currency pairs are 1.0 without hitting the provider.
///
/// Returns positive FX rate.
pub async fn fx_rate(
    ctx: &AppContext,
    from: &str,
    to: &str,
    force: bool,
) -> std::result::Result<f64, MarketError> {
    let from = from.trim().to_ascii_uppercase();
    let to = to.trim().to_ascii_uppercase();
    if from.is_empty() || to.is_empty() {
        return Err(MarketError::Upstream("empty FX currency".to_string()));
    }
    if from == to {
        return Ok(1.0);
    }

    let key = fx_cache_key(&from, &to);
    if !force
        && let Ok(Some(cached)) = ctx.cache.get::<f64>(&key).await
        && cached > 0.0
    {
        return Ok(cached);
    }

    let rate = client(ctx)?.fx_rate(&from, &to).await?;
    if rate <= 0.0 {
        return Err(MarketError::Upstream(format!(
            "Unable to resolve FX rate {from} -> {to}"
        )));
    }
    if let Err(err) = ctx.cache.insert_with_expiry(&key, &rate, FX_TTL).await {
        tracing::debug!(error = %err, key, "fx cache insert skipped");
    }
    Ok(rate)
}

/// Native → EUR multiplier for an instrument currency (pence scale included).
///
/// The provider rate is converted to [`Decimal`] here so every amount
/// downstream stays exact.
pub async fn fx_rate_to_eur(
    ctx: &AppContext,
    currency: &str,
    force: bool,
) -> std::result::Result<Decimal, MarketError> {
    let (major, scale) = fx_basis(currency);
    let rate = fx_rate(ctx, &major, DISPLAY_CURRENCY, force).await?;
    let rate = Decimal::try_from(rate)
        .map_err(|_| MarketError::Upstream(format!("Invalid FX rate {major} -> EUR: {rate}")))?;
    Ok(rate * scale)
}

#[must_use]
pub fn quote_detail_cache_key(symbol: &str) -> String {
    format!("fq:quote-detail:{symbol}")
}

#[must_use]
pub fn chart_cache_key(symbol: &str, range: &str) -> String {
    format!("fq:chart:{symbol}:{range}")
}

#[must_use]
pub fn news_cache_key(symbol: &str) -> String {
    format!("fq:news:{symbol}")
}

#[must_use]
pub fn recommendations_cache_key(symbol: &str, limit: u32) -> String {
    format!("fq:recommendations:{symbol}:{limit}")
}

/// Cached detailed quote (`fq:quote-detail:{symbol}`, 60 s).
pub async fn quote_detail(
    ctx: &AppContext,
    symbol: &str,
    force: bool,
) -> std::result::Result<Option<SymbolQuoteDto>, MarketError> {
    let Some(symbol) = first_symbol(symbol) else {
        return Ok(None);
    };
    let key = quote_detail_cache_key(&symbol);
    if !force && let Ok(Some(cached)) = ctx.cache.get::<SymbolQuoteDto>(&key).await {
        return Ok(Some(cached));
    }
    let quote = client(ctx)?.quote_detail(&symbol).await?;
    if let Some(ref quote) = quote
        && let Err(err) = ctx.cache.insert_with_expiry(&key, quote, QUOTE_TTL).await
    {
        tracing::debug!(error = %err, key, "quote-detail cache insert skipped");
    }
    Ok(quote)
}

/// Cached chart points for one window (60s, same as quotes).
pub async fn chart(
    ctx: &AppContext,
    symbol: &str,
    range: &str,
    force: bool,
) -> std::result::Result<Vec<ChartPointDto>, MarketError> {
    let Some(symbol) = first_symbol(symbol) else {
        return Ok(Vec::new());
    };
    let range = crate::dtos::symbol::normalize_chart_range(range);
    let key = chart_cache_key(&symbol, &range);
    if !force && let Ok(Some(cached)) = ctx.cache.get::<Vec<ChartPointDto>>(&key).await {
        return Ok(cached);
    }
    let points = client(ctx)?.chart(&symbol, &range).await?;
    if let Err(err) = ctx.cache.insert_with_expiry(&key, &points, QUOTE_TTL).await {
        tracing::debug!(error = %err, key, "chart cache insert skipped");
    }
    Ok(points)
}

/// Cached news (`fq:news:{symbol}`, 15 min).
pub async fn news(
    ctx: &AppContext,
    symbol: &str,
) -> std::result::Result<Vec<SymbolNewsItemDto>, MarketError> {
    let Some(symbol) = first_symbol(symbol) else {
        return Ok(Vec::new());
    };
    let key = news_cache_key(&symbol);
    if let Ok(Some(cached)) = ctx.cache.get::<Vec<SymbolNewsItemDto>>(&key).await {
        return Ok(cached);
    }
    let items = client(ctx)?.news(&symbol).await?;
    if let Err(err) = ctx.cache.insert_with_expiry(&key, &items, NEWS_TTL).await {
        tracing::debug!(error = %err, key, "news cache insert skipped");
    }
    Ok(items)
}

/// Cached similar symbols (`fq:recommendations:{symbol}:{limit}`, 15 min).
pub async fn recommendations(
    ctx: &AppContext,
    symbol: &str,
    limit: u32,
) -> std::result::Result<Vec<SymbolRecommendationDto>, MarketError> {
    let Some(symbol) = first_symbol(symbol) else {
        return Ok(Vec::new());
    };
    let limit = limit.clamp(1, 25);
    let key = recommendations_cache_key(&symbol, limit);
    if let Ok(Some(cached)) = ctx.cache.get::<Vec<SymbolRecommendationDto>>(&key).await {
        return Ok(cached);
    }
    let items = client(ctx)?.recommendations(&symbol, limit).await?;
    if let Err(err) = ctx.cache.insert_with_expiry(&key, &items, NEWS_TTL).await {
        tracing::debug!(error = %err, key, "recommendations cache insert skipped");
    }
    Ok(items)
}

/// Spark cache key, `fq:spark:{hash}:{interval}:{range}`.
///
/// Symbols are already unique; we join them instead of hashing so tests can
/// assert the key without an MD5 crate.
///
/// Returns cache key.
#[must_use]
pub fn spark_cache_key(symbols: &[String], interval: &str, range: &str) -> String {
    format!("fq:spark:{}:{interval}:{range}", symbols.join(","))
}

/// Cached 5m/1d spark lines (60 s).
///
/// Empty input returns `{}`. Provider failures bubble as [`MarketError`].
///
/// Returns map of symbol → closes/timestamps.
pub async fn spark(
    ctx: &AppContext,
    symbols: &[String],
    force: bool,
) -> std::result::Result<HashMap<String, SparkSeriesDto>, MarketError> {
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }
    let mut sorted = symbols.to_vec();
    sorted.sort();
    sorted.dedup();
    let key = spark_cache_key(&sorted, "5m", "1d");
    if !force && let Ok(Some(cached)) = ctx.cache.get::<HashMap<String, SparkSeriesDto>>(&key).await
    {
        return Ok(cached);
    }
    let series = client(ctx)?.spark(&sorted).await?;
    if let Err(err) = ctx.cache.insert_with_expiry(&key, &series, QUOTE_TTL).await {
        tracing::debug!(error = %err, key, "spark cache insert skipped");
    }
    Ok(series)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_cache_key_is_stable_and_lowercased() {
        assert_eq!(search_cache_key("AAPL", 25, "FR"), "fq:search:aapl:25:fr");
    }

    #[test]
    fn quote_cache_key_uses_the_symbol() {
        assert_eq!(quote_cache_key("MSFT"), "fq:quote:MSFT");
    }

    #[test]
    fn fx_cache_key_joins_the_pair() {
        assert_eq!(fx_cache_key("USD", "EUR"), "fq:fx:USDEUR");
    }

    #[test]
    fn fx_basis_scales_pence() {
        assert_eq!(fx_basis("GBX"), ("GBP".to_string(), Decimal::new(1, 2)));
        assert_eq!(fx_basis(" usd "), ("USD".to_string(), Decimal::ONE));
        assert_eq!(fx_basis(""), ("USD".to_string(), Decimal::ONE));
    }

    #[test]
    fn symbol_page_cache_keys_are_namespaced() {
        assert_eq!(quote_detail_cache_key("AAPL"), "fq:quote-detail:AAPL");
        assert_eq!(chart_cache_key("AAPL", "1mo"), "fq:chart:AAPL:1mo");
        assert_eq!(news_cache_key("AAPL"), "fq:news:AAPL");
        assert_eq!(
            recommendations_cache_key("AAPL", 5),
            "fq:recommendations:AAPL:5"
        );
    }

    #[test]
    fn spark_cache_key_joins_symbols() {
        assert_eq!(
            spark_cache_key(&["AAPL".into(), "MSFT".into()], "5m", "1d"),
            "fq:spark:AAPL,MSFT:5m:1d"
        );
    }
}
