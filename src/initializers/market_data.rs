//! Registers the market-data provider selected by `settings.market_data.provider`.
//!
//! Called from `App::after_context`, not an [`Initializer`](loco_rs::app::Initializer):
//! initializers only run under `start`, while tasks (e.g. the scheduled
//! `portfolio:snapshot`) also need the provider.

use loco_rs::prelude::*;

use crate::services::finance_query::{MarketDataClient, MarketDataSettings};

/// Stores the configured [`MarketDataClient`] in `ctx.shared_store`.
///
/// # Errors
///
/// When `settings.market_data` is missing or invalid.
pub fn register(ctx: &AppContext) -> Result<()> {
    let settings = MarketDataSettings::from_config(&ctx.config)?;
    tracing::info!(provider = ?settings.provider, "market data provider registered");
    ctx.shared_store
        .insert(MarketDataClient::new(settings.provider));
    Ok(())
}
