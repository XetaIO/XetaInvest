use std::collections::HashMap;

use finance_query::{
    Interval, LookupOptions, LookupType, Region, Ticker, Tickers, TimeRange, finance,
};

use crate::dtos::market::{QuoteDto, SymbolSearchResult};
use crate::dtos::symbol::{
    ChartPointDto, SymbolNewsItemDto, SymbolQuoteDto, SymbolRecommendationDto,
};
use crate::dtos::watchlists::SparkSeriesDto;

use super::MarketData;
use super::error::MarketError;
use super::mapping::{SearchHit, map_quote_fields, map_search_hit};

/// Production client: calls the `finance-query` crate in-process.
pub struct CrateMarketData;

/// Maps a crate lookup row onto our DTO via [`SearchHit`].
///
/// Returns JSON search hit.
fn map_lookup_quote(quote: &finance_query::LookupQuote) -> SymbolSearchResult {
    map_search_hit(SearchHit {
        symbol: quote.symbol.clone(),
        short_name: quote.short_name.clone(),
        long_name: quote.long_name.clone(),
        exchange: quote.exchange.clone(),
        quote_type: quote.quote_type.clone(),
        logo_url: quote.logo_url.clone(),
        company_logo_url: quote.company_logo_url.clone(),
    })
}

/// Pulls the raw `f64` out of a crate `Both` formatted value.
///
/// Returns the raw number, if present.
fn raw_f64(value: Option<&finance_query::FormattedValue<f64>>) -> Option<f64> {
    value.and_then(|formatted| formatted.raw)
}

fn raw_i64_as_f64(value: Option<&finance_query::FormattedValue<i64>>) -> Option<f64> {
    value.and_then(|formatted| formatted.raw).map(count_as_f64)
}

/// Counts (volumes, head counts) are displayed, never computed with: the
/// precision lost above 2^53 is irrelevant.
#[allow(clippy::cast_precision_loss)]
fn count_as_f64(value: i64) -> f64 {
    value as f64
}

fn nonempty(value: Option<String>) -> Option<String> {
    value.filter(|text| !text.trim().is_empty())
}

/// Maps a crate batch quote onto [`QuoteDto`].
///
/// Returns JSON quote DTO.
fn map_crate_quote(quote: &finance_query::Quote) -> QuoteDto {
    map_quote_fields(
        quote.symbol.clone(),
        quote.short_name.clone().or_else(|| quote.long_name.clone()),
        quote.exchange.clone(),
        quote.quote_type.clone(),
        quote.currency.clone(),
        raw_f64(quote.regular_market_price.as_ref()),
        raw_f64(quote.regular_market_change.as_ref()),
        raw_f64(quote.regular_market_change_percent.as_ref()),
        raw_f64(quote.regular_market_previous_close.as_ref()),
        quote.logo_url.clone(),
        quote.company_logo_url.clone(),
    )
}

/// Maps a crate quote onto the symbol-page DTO.
///
/// Returns JSON fields consumed by the SPA.
fn map_symbol_quote(quote: &finance_query::Quote) -> SymbolQuoteDto {
    SymbolQuoteDto {
        symbol: quote.symbol.clone(),
        name: nonempty(quote.long_name.clone()).or_else(|| nonempty(quote.short_name.clone())),
        short_name: nonempty(quote.short_name.clone()),
        exchange: nonempty(quote.exchange.clone())
            .or_else(|| nonempty(quote.exchange_name.clone())),
        exchange_name: nonempty(quote.exchange_name.clone()),
        currency: nonempty(quote.currency.clone()),
        currency_symbol: nonempty(quote.currency_symbol.clone()),
        quote_type: nonempty(quote.quote_type.clone()).map(|value| value.to_ascii_lowercase()),
        market_state: nonempty(quote.market_state.clone()),
        sector: nonempty(quote.sector.clone()).or_else(|| nonempty(quote.sector_disp.clone())),
        industry: nonempty(quote.industry.clone())
            .or_else(|| nonempty(quote.industry_disp.clone())),
        country: nonempty(quote.country.clone()),
        city: nonempty(quote.city.clone()),
        website: nonempty(quote.website.clone()),
        long_business_summary: nonempty(quote.long_business_summary.clone()),
        full_time_employees: quote.full_time_employees.map(count_as_f64),
        logo_url: nonempty(quote.logo_url.clone())
            .or_else(|| nonempty(quote.company_logo_url.clone())),
        price: raw_f64(quote.regular_market_price.as_ref())
            .or_else(|| raw_f64(quote.current_price.as_ref())),
        change: raw_f64(quote.regular_market_change.as_ref()),
        change_percent: raw_f64(quote.regular_market_change_percent.as_ref()),
        previous_close: raw_f64(quote.regular_market_previous_close.as_ref())
            .or_else(|| raw_f64(quote.previous_close.as_ref())),
        open: raw_f64(quote.regular_market_open.as_ref()).or_else(|| raw_f64(quote.open.as_ref())),
        day_high: raw_f64(quote.regular_market_day_high.as_ref())
            .or_else(|| raw_f64(quote.day_high.as_ref())),
        day_low: raw_f64(quote.regular_market_day_low.as_ref())
            .or_else(|| raw_f64(quote.day_low.as_ref())),
        bid: raw_f64(quote.bid.as_ref()),
        ask: raw_f64(quote.ask.as_ref()),
        fifty_two_week_high: raw_f64(quote.fifty_two_week_high.as_ref()),
        fifty_two_week_low: raw_f64(quote.fifty_two_week_low.as_ref()),
        fifty_two_week_change: raw_f64(quote.week_52_change.as_ref()),
        fifty_day_average: raw_f64(quote.fifty_day_average.as_ref()),
        two_hundred_day_average: raw_f64(quote.two_hundred_day_average.as_ref()),
        all_time_high: raw_f64(quote.all_time_high.as_ref()),
        all_time_low: raw_f64(quote.all_time_low.as_ref()),
        volume: raw_i64_as_f64(quote.regular_market_volume.as_ref())
            .or_else(|| raw_i64_as_f64(quote.volume.as_ref())),
        avg_volume: raw_i64_as_f64(quote.average_volume.as_ref())
            .or_else(|| raw_i64_as_f64(quote.average_daily_volume3_month.as_ref())),
        avg_volume_10d: raw_i64_as_f64(quote.average_daily_volume10_day.as_ref())
            .or_else(|| raw_i64_as_f64(quote.average_volume10days.as_ref())),
        market_cap: raw_i64_as_f64(quote.market_cap.as_ref()),
        enterprise_value: raw_i64_as_f64(quote.enterprise_value.as_ref()),
        pe: raw_f64(quote.trailing_pe.as_ref()),
        forward_pe: raw_f64(quote.forward_pe.as_ref()),
        price_to_book: raw_f64(quote.price_to_book.as_ref()),
        price_to_sales: raw_f64(quote.price_to_sales_trailing12_months.as_ref()),
        book_value: raw_f64(quote.book_value.as_ref()),
        enterprise_to_revenue: raw_f64(quote.enterprise_to_revenue.as_ref()),
        enterprise_to_ebitda: raw_f64(quote.enterprise_to_ebitda.as_ref()),
        eps: raw_f64(quote.trailing_eps.as_ref()),
        forward_eps: raw_f64(quote.forward_eps.as_ref()),
        ebitda: raw_i64_as_f64(quote.ebitda.as_ref()),
        ebitda_margins: raw_f64(quote.ebitda_margins.as_ref()),
        gross_margins: raw_f64(quote.gross_margins.as_ref()),
        operating_margins: raw_f64(quote.operating_margins.as_ref()),
        profit_margins: raw_f64(quote.profit_margins.as_ref()),
        return_on_assets: raw_f64(quote.return_on_assets.as_ref()),
        return_on_equity: raw_f64(quote.return_on_equity.as_ref()),
        revenue: raw_i64_as_f64(quote.total_revenue.as_ref()),
        revenue_growth: raw_f64(quote.revenue_growth.as_ref()),
        revenue_per_share: raw_f64(quote.revenue_per_share.as_ref()),
        gross_profits: raw_i64_as_f64(quote.gross_profits.as_ref()),
        total_cash: raw_i64_as_f64(quote.total_cash.as_ref()),
        total_cash_per_share: raw_f64(quote.total_cash_per_share.as_ref()),
        total_debt: raw_i64_as_f64(quote.total_debt.as_ref()),
        debt_to_equity: raw_f64(quote.debt_to_equity.as_ref()),
        current_ratio: raw_f64(quote.current_ratio.as_ref()),
        quick_ratio: raw_f64(quote.quick_ratio.as_ref()),
        free_cashflow: raw_i64_as_f64(quote.free_cashflow.as_ref()),
        operating_cashflow: raw_i64_as_f64(quote.operating_cashflow.as_ref()),
        shares_outstanding: raw_i64_as_f64(quote.shares_outstanding.as_ref())
            .or_else(|| raw_i64_as_f64(quote.implied_shares_outstanding.as_ref())),
        float_shares: raw_i64_as_f64(quote.float_shares.as_ref()),
        held_percent_insiders: raw_f64(quote.held_percent_insiders.as_ref()),
        held_percent_institutions: raw_f64(quote.held_percent_institutions.as_ref()),
        dividend_rate: raw_f64(quote.dividend_rate.as_ref())
            .or_else(|| raw_f64(quote.trailing_annual_dividend_rate.as_ref())),
        dividend_yield: raw_f64(quote.dividend_yield.as_ref())
            .or_else(|| raw_f64(quote.trailing_annual_dividend_yield.as_ref())),
        payout_ratio: raw_f64(quote.payout_ratio.as_ref()),
        beta: raw_f64(quote.beta.as_ref()),
        target_mean_price: raw_f64(quote.target_mean_price.as_ref()),
        target_high_price: raw_f64(quote.target_high_price.as_ref()),
        target_low_price: raw_f64(quote.target_low_price.as_ref()),
        target_median_price: raw_f64(quote.target_median_price.as_ref()),
        number_of_analyst_opinions: raw_i64_as_f64(quote.number_of_analyst_opinions.as_ref()),
        recommendation_key: nonempty(quote.recommendation_key.clone()),
    }
}

/// Maps one OHLCV candle onto a chart point (unix seconds as string).
///
/// Returns SPA chart row.
fn map_candle(candle: &finance_query::Candle) -> ChartPointDto {
    ChartPointDto {
        date: candle.timestamp.to_string(),
        close: candle.close,
        open: Some(candle.open),
        high: Some(candle.high),
        low: Some(candle.low),
        volume: Some(count_as_f64(candle.volume)),
    }
}

/// Maps a news article; relative links become stockanalysis.com URLs.
///
/// Returns SPA news card.
fn map_news_item(item: &finance_query::News) -> SymbolNewsItemDto {
    let link = item.link.trim();
    let link = if link.is_empty() {
        String::new()
    } else if link.starts_with("http://") || link.starts_with("https://") {
        link.to_string()
    } else {
        format!("https://stockanalysis.com/{}", link.trim_start_matches('/'))
    };
    let image = nonempty(Some(item.img.clone()));
    SymbolNewsItemDto {
        title: item.title.clone(),
        link,
        source: item.source.clone(),
        image,
        time: item.time.clone(),
    }
}

/// Maps a similar-symbol row (name filled later by quotes).
///
/// Returns symbol + score.
fn map_recommendation(item: &finance_query::SimilarSymbol) -> SymbolRecommendationDto {
    SymbolRecommendationDto {
        symbol: item.symbol.to_ascii_uppercase(),
        name: None,
        score: Some(item.score),
    }
}

/// Builds a live [`Ticker`] with logos enabled.
///
/// Returns crate handle, or an upstream error.
async fn ticker(symbol: &str) -> std::result::Result<Ticker, MarketError> {
    Ticker::builder(symbol)
        .logo()
        .build()
        .await
        .map_err(|err| MarketError::Upstream(err.to_string()))
}

/// Parses `FR` / `US` into the crate [`Region`] enum.
///
/// Returns `Region::France` unless `US`/`EN` is given.
fn parse_region(region: &str) -> Region {
    match region.to_ascii_uppercase().as_str() {
        "US" | "EN" => Region::UnitedStates,
        _ => Region::France,
    }
}

#[async_trait::async_trait]
impl MarketData for CrateMarketData {
    /// Calls `finance::lookup`.
    ///
    /// Returns mapped hits.
    async fn search(
        &self,
        query: &str,
        limit: u32,
        region: &str,
    ) -> std::result::Result<Vec<SymbolSearchResult>, MarketError> {
        let options = LookupOptions::new()
            .lookup_type(LookupType::All)
            .count(limit)
            .include_logo(true)
            .region(parse_region(region));

        let results = finance::lookup(query, &options)
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;

        Ok(results.quotes.iter().map(map_lookup_quote).collect())
    }

    /// Calls `Tickers::quotes`.
    ///
    /// Returns mapped quotes keyed by symbol.
    async fn quotes(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, QuoteDto>, MarketError> {
        let tickers = Tickers::builder(symbols.iter().cloned())
            .logo()
            .build()
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;

        let response = tickers
            .quotes()
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;

        Ok(response
            .quotes
            .iter()
            .map(|(symbol, quote)| (symbol.clone(), map_crate_quote(quote)))
            .collect())
    }

    /// Quotes the Yahoo pair `{FROM}{TO}=X`
    ///
    /// Returns `regular_market_price` of that pair.
    async fn fx_rate(&self, from: &str, to: &str) -> std::result::Result<f64, MarketError> {
        if from.eq_ignore_ascii_case(to) {
            return Ok(1.0);
        }
        let symbol = format!("{from}{to}=X");
        let quotes = self.quotes(std::slice::from_ref(&symbol)).await?;
        quotes
            .get(&symbol)
            .or_else(|| quotes.values().next())
            .and_then(|quote| quote.regular_market_price)
            .filter(|price| *price > 0.0)
            .ok_or_else(|| {
                MarketError::Upstream(format!("Unable to resolve FX rate {from} -> {to}"))
            })
    }

    /// Calls `Ticker::quote`.
    ///
    /// Returns mapped detailed quote.
    async fn quote_detail(
        &self,
        symbol: &str,
    ) -> std::result::Result<Option<SymbolQuoteDto>, MarketError> {
        let ticker = ticker(symbol).await?;
        // The crate future is large; box it instead of inlining it in ours.
        let quote: finance_query::Quote = Box::pin(ticker.quote())
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        Ok(Some(map_symbol_quote(&quote)))
    }

    /// Calls `Ticker::chart` with the range's default interval.
    ///
    /// Returns close-series points.
    async fn chart(
        &self,
        symbol: &str,
        range: &str,
    ) -> std::result::Result<Vec<ChartPointDto>, MarketError> {
        let range: TimeRange = range.parse().unwrap_or(TimeRange::OneMonth);
        let ticker = ticker(symbol).await?;
        let chart = ticker
            .chart(range.default_interval(), range)
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        Ok(chart.candles.iter().map(map_candle).collect())
    }

    /// Calls `Ticker::news`.
    ///
    /// Returns headlines, newest first.
    async fn news(&self, symbol: &str) -> std::result::Result<Vec<SymbolNewsItemDto>, MarketError> {
        let ticker = ticker(symbol).await?;
        let items = ticker
            .news()
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        Ok(items.iter().map(map_news_item).collect())
    }

    /// Calls `Ticker::recommendations`.
    ///
    /// Returns similar tickers.
    async fn recommendations(
        &self,
        symbol: &str,
        limit: u32,
    ) -> std::result::Result<Vec<SymbolRecommendationDto>, MarketError> {
        let ticker = ticker(symbol).await?;
        let payload = ticker
            .recommendations(limit)
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        Ok(payload
            .recommendations
            .iter()
            .map(map_recommendation)
            .collect())
    }

    /// Calls `Tickers::spark` at 5m / 1d : watchlist history.
    ///
    /// Returns close series keyed by symbol; empty series omitted.
    async fn spark(
        &self,
        symbols: &[String],
    ) -> std::result::Result<HashMap<String, SparkSeriesDto>, MarketError> {
        let tickers = Tickers::builder(symbols.iter().cloned())
            .build()
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        let response = tickers
            .spark(Interval::FiveMinutes, TimeRange::OneDay)
            .await
            .map_err(|err| MarketError::Upstream(err.to_string()))?;
        Ok(response
            .sparks
            .into_iter()
            .filter(|(_, spark)| !spark.closes.is_empty())
            .map(|(symbol, spark)| {
                (
                    symbol,
                    SparkSeriesDto {
                        closes: spark.closes,
                        timestamps: spark.timestamps,
                    },
                )
            })
            .collect())
    }
}
