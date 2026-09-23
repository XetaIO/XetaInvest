//! Registers the market-data provider selected by `settings.market_data.provider`.

use async_trait::async_trait;
use loco_rs::prelude::*;

use crate::services::finance_query::{MarketDataClient, MarketDataSettings};

pub struct MarketDataInitializer;

#[async_trait]
impl Initializer for MarketDataInitializer {
    fn name(&self) -> String {
        "market-data".to_string()
    }

    async fn before_run(&self, ctx: &AppContext) -> Result<()> {
        let settings = MarketDataSettings::from_config(&ctx.config)?;
        tracing::info!(provider = ?settings.provider, "market data provider registered");
        ctx.shared_store
            .insert(MarketDataClient::new(settings.provider));
        Ok(())
    }
}
