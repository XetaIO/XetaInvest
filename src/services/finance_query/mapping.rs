use crate::dtos::market::{QuoteDto, SymbolSearchResult};

/// Minimum characters before we call the provider.
pub const MIN_QUERY_LEN: usize = 2;
/// Maximum characters accepted for `q`.
pub const MAX_QUERY_LEN: usize = 100;
/// Default lookup count.
pub const DEFAULT_LIMIT: u32 = 25;
/// Hard cap on lookup count and on the quotes batch size.
pub const MAX_LIMIT: u32 = 50;

/// Provider-agnostic search row, so mapping can be unit-tested without the crate.
#[derive(Debug, Clone, Default)]
pub struct SearchHit {
    pub symbol: String,
    pub short_name: Option<String>,
    pub long_name: Option<String>,
    pub exchange: Option<String>,
    pub quote_type: Option<String>,
    pub logo_url: Option<String>,
    pub company_logo_url: Option<String>,
}

/// Trims and rejects queries that must not hit the provider.
///
/// Returns normalized query, or `None` when empty / too short / too long.
#[must_use]
pub fn normalize_search_query(query: &str) -> Option<String> {
    let trimmed = query.trim();
    if trimmed.len() < MIN_QUERY_LEN || trimmed.len() > MAX_QUERY_LEN {
        return None;
    }
    Some(trimmed.to_string())
}

/// Clamps the lookup count to `1..=50`, defaulting to 25.
///
/// Returns value sent to the provider.
#[must_use]
pub fn normalize_limit(limit: Option<u32>) -> u32 {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

/// Splits `AAPL, msft,,` into unique uppercased tickers, max 50.
///
/// Returns deduplicated list, original order kept.
#[must_use]
pub fn parse_symbols(symbols_csv: &str) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut symbols = Vec::new();

    for part in symbols_csv.split(',') {
        let symbol = part.trim().to_ascii_uppercase();
        if symbol.is_empty() || !seen.insert(symbol.clone()) {
            continue;
        }
        symbols.push(symbol);
        if symbols.len() == MAX_LIMIT as usize {
            break;
        }
    }

    symbols
}

/// The first ticker of `value`, normalized like [`parse_symbols`].
#[must_use]
pub fn first_symbol(value: &str) -> Option<String> {
    parse_symbols(value).into_iter().next()
}

/// Maps a provider search row onto the JSON DTO.
///
/// Name prefers `short_name`, then `long_name`. Logo prefers `logo_url`, then
/// `company_logo_url`. Quote type is lowercased so the SPA tabs (`equity`) match.
///
/// Returns JSON search hit (`type` is `quote_type` in Rust).
#[must_use]
pub fn map_search_hit(hit: SearchHit) -> SymbolSearchResult {
    let name = nonempty(hit.short_name).or_else(|| nonempty(hit.long_name));
    let quote_type = nonempty(hit.quote_type).map(|value| value.to_ascii_lowercase());
    let logo_url = nonempty(hit.logo_url).or_else(|| nonempty(hit.company_logo_url));

    SymbolSearchResult {
        symbol: hit.symbol,
        name,
        exchange: nonempty(hit.exchange),
        quote_type,
        logo_url,
    }
}

/// Maps quote scalar fields onto [`QuoteDto`].
///
/// Returns JSON quote DTO.
#[allow(clippy::too_many_arguments)]
#[must_use]
pub fn map_quote_fields(
    symbol: String,
    name: Option<String>,
    exchange: Option<String>,
    quote_type: Option<String>,
    currency: Option<String>,
    regular_market_price: Option<f64>,
    regular_market_change: Option<f64>,
    regular_market_change_percent: Option<f64>,
    regular_market_previous_close: Option<f64>,
    logo_url: Option<String>,
    company_logo_url: Option<String>,
) -> QuoteDto {
    QuoteDto {
        symbol,
        name: nonempty(name),
        exchange: nonempty(exchange),
        quote_type: nonempty(quote_type).map(|value| value.to_ascii_lowercase()),
        currency: nonempty(currency),
        regular_market_price,
        regular_market_change,
        regular_market_change_percent,
        regular_market_previous_close,
        logo_url: nonempty(logo_url).or_else(|| nonempty(company_logo_url)),
    }
}

/// Drops empty strings so JSON gets `null` instead of `""`.
///
/// Returns `None` when missing or blank.
fn nonempty(value: Option<String>) -> Option<String> {
    value.filter(|text| !text.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_search_query_rejects_short_and_long() {
        assert_eq!(normalize_search_query(" a "), None);
        assert_eq!(normalize_search_query(""), None);
        assert_eq!(normalize_search_query("aa"), Some("aa".to_string()));
        assert_eq!(normalize_search_query("  AAPL  "), Some("AAPL".to_string()));
        assert_eq!(normalize_search_query(&"x".repeat(MAX_QUERY_LEN + 1)), None);
    }

    #[test]
    fn normalize_limit_clamps() {
        assert_eq!(normalize_limit(None), 25);
        assert_eq!(normalize_limit(Some(0)), 1);
        assert_eq!(normalize_limit(Some(100)), 50);
        assert_eq!(normalize_limit(Some(10)), 10);
    }

    #[test]
    fn parse_symbols_dedupes_and_caps() {
        assert_eq!(parse_symbols("aapl, MSFT, aapl,,"), vec!["AAPL", "MSFT"]);
        assert_eq!(parse_symbols("  "), Vec::<String>::new());
        assert_eq!(
            parse_symbols(
                &(0..60)
                    .map(|i| format!("S{i}"))
                    .collect::<Vec<_>>()
                    .join(",")
            )
            .len(),
            50
        );
    }

    #[test]
    fn map_search_hit_prefers_short_name_and_logo_url() {
        let dto = map_search_hit(SearchHit {
            symbol: "AAPL".into(),
            short_name: Some("Apple Inc.".into()),
            long_name: Some("Apple".into()),
            exchange: Some("NMS".into()),
            quote_type: Some("EQUITY".into()),
            logo_url: Some("https://example.com/aapl.png".into()),
            company_logo_url: Some("https://example.com/other.png".into()),
        });
        assert_eq!(dto.symbol, "AAPL");
        assert_eq!(dto.name.as_deref(), Some("Apple Inc."));
        assert_eq!(dto.quote_type.as_deref(), Some("equity"));
        assert_eq!(
            dto.logo_url.as_deref(),
            Some("https://example.com/aapl.png")
        );
    }

    #[test]
    fn map_search_hit_falls_back_to_company_logo_and_long_name() {
        let dto = map_search_hit(SearchHit {
            symbol: "NVDA".into(),
            short_name: Some(String::new()),
            long_name: Some("NVIDIA Corporation".into()),
            exchange: Some("NMS".into()),
            quote_type: Some("equity".into()),
            logo_url: None,
            company_logo_url: Some("https://example.com/nvidia.png".into()),
        });
        assert_eq!(dto.name.as_deref(), Some("NVIDIA Corporation"));
        assert_eq!(
            dto.logo_url.as_deref(),
            Some("https://example.com/nvidia.png")
        );
    }

    #[test]
    fn map_search_hit_nulls_missing_logo() {
        let dto = map_search_hit(SearchHit {
            symbol: "XYZ".into(),
            short_name: Some("XYZ Corp".into()),
            long_name: None,
            exchange: Some("NYQ".into()),
            quote_type: Some("equity".into()),
            logo_url: None,
            company_logo_url: None,
        });
        assert_eq!(dto.logo_url, None);
    }

    #[test]
    fn map_quote_fields_lowercases_type_and_falls_back_logo() {
        let dto = map_quote_fields(
            "MSFT".into(),
            Some("Microsoft".into()),
            Some("NMS".into()),
            Some("EQUITY".into()),
            Some("USD".into()),
            Some(400.0),
            Some(1.5),
            Some(0.4),
            Some(398.5),
            None,
            Some("https://example.com/msft.png".into()),
        );
        assert_eq!(dto.quote_type.as_deref(), Some("equity"));
        assert_eq!(dto.regular_market_price, Some(400.0));
        assert_eq!(
            dto.logo_url.as_deref(),
            Some("https://example.com/msft.png")
        );
    }
}
