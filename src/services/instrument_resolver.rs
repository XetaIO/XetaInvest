//! Persists an instrument the first time a ticker is used.
//!
//! Lookup order: DB → market search (exact symbol) → quote fallback.
//! The model only does persistence; this service talks to [`finance_query`].

use loco_rs::prelude::*;

use crate::dtos::market::{QuoteDto, SymbolSearchResult};
use crate::models::_entities::instruments::{ActiveModel, Entity, Model};
use crate::services::finance_query::{self, client};

/// Normalizes a ticker (`trim` + uppercase).
///
/// Returns uppercased ticker, or `None` if blank.
#[must_use]
pub fn normalize_symbol(symbol: &str) -> Option<String> {
    let trimmed = symbol.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_ascii_uppercase())
}

/// Resolves a ticker to a DB row, creating it from market data if needed.
///
/// Same symbol twice returns the same row.
/// Unknown to both search and quotes → `Ok(None)`. Provider errors are
/// logged and treated as "no data", not a 500.
///
/// Returns the instrument, or `None` if the market does not know it.
pub async fn resolve(ctx: &AppContext, symbol: &str) -> Result<Option<Model>> {
    let Some(symbol) = normalize_symbol(symbol) else {
        return Ok(None);
    };

    if let Some(existing) = Entity::find_by_symbol(&ctx.db, &symbol).await? {
        return Ok(Some(existing));
    }

    let search_hit = lookup_search_hit(ctx, &symbol).await;
    let quote = lookup_quote(ctx, &symbol).await;

    if search_hit.is_none() && quote.is_none() {
        return Ok(None);
    }

    insert_instrument(ctx, &symbol, search_hit.as_ref(), quote.as_ref()).await
}

/// Looks up an exact search hit (limit 5).
///
/// Returns the matching hit, if the provider returned this exact symbol.
async fn lookup_search_hit(ctx: &AppContext, symbol: &str) -> Option<SymbolSearchResult> {
    let client = match client(ctx) {
        Ok(client) => client,
        Err(err) => {
            tracing::warn!(error = %err, symbol, "instrument search unavailable");
            return None;
        }
    };
    match client.search(symbol, 5, "FR").await {
        Ok(hits) => hits
            .into_iter()
            .find(|hit| hit.symbol.eq_ignore_ascii_case(symbol)),
        Err(err) => {
            tracing::warn!(error = %err, symbol, "instrument search failed");
            None
        }
    }
}

/// Fetches a single quote for the ticker.
///
/// Returns quote DTO, or `None` on miss / provider error.
async fn lookup_quote(ctx: &AppContext, symbol: &str) -> Option<QuoteDto> {
    match finance_query::quote(ctx, symbol, false).await {
        Ok(quote) => quote,
        Err(err) => {
            tracing::warn!(error = %err, symbol, "instrument quote failed");
            None
        }
    }
}

/// Inserts a new instrument. On unique conflict (two concurrent resolves),
/// reloads the existing row.
///
/// Returns the persisted row.
async fn insert_instrument(
    ctx: &AppContext,
    symbol: &str,
    search_hit: Option<&SymbolSearchResult>,
    quote: Option<&QuoteDto>,
) -> Result<Option<Model>> {
    let name = search_hit
        .and_then(|hit| hit.name.clone())
        .or_else(|| quote.and_then(|q| q.name.clone()))
        .unwrap_or_else(|| symbol.to_string());
    let exchange = search_hit
        .and_then(|hit| hit.exchange.clone())
        .or_else(|| quote.and_then(|q| q.exchange.clone()));
    let quote_type = search_hit
        .and_then(|hit| hit.quote_type.clone())
        .or_else(|| quote.and_then(|q| q.quote_type.clone()));
    let currency = quote
        .and_then(|q| q.currency.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "USD".to_string())
        .to_ascii_uppercase();

    let now: DateTimeWithTimeZone = chrono::Utc::now().into();
    let model = ActiveModel {
        symbol: Set(symbol.to_string()),
        name: Set(name),
        exchange: Set(exchange),
        quote_type: Set(quote_type),
        currency: Set(currency),
        last_synced_at: Set(Some(now)),
        ..Default::default()
    };

    match model.insert(&ctx.db).await {
        Ok(row) => Ok(Some(row)),
        Err(err) => {
            if let Some(existing) = Entity::find_by_symbol(&ctx.db, symbol).await? {
                return Ok(Some(existing));
            }
            tracing::error!(error = %err, symbol, "instrument insert failed");
            Err(err.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_symbol_trims_and_uppercases() {
        assert_eq!(normalize_symbol(" aapl "), Some("AAPL".to_string()));
        assert_eq!(normalize_symbol(""), None);
        assert_eq!(normalize_symbol("   "), None);
    }
}
