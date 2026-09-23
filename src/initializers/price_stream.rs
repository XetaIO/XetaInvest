//! Registers the [`PriceHub`] and, with the live provider, its upstream stream.

use async_trait::async_trait;
use loco_rs::prelude::*;

use crate::services::finance_query::{MarketDataSettings, Provider};
use crate::services::price_stream::{self, PriceHub};

pub struct PriceStreamInitializer;

#[async_trait]
impl Initializer for PriceStreamInitializer {
    fn name(&self) -> String {
        "price-stream".to_string()
    }

    async fn before_run(&self, ctx: &AppContext) -> Result<()> {
        let hub = PriceHub::new();
        if MarketDataSettings::from_config(&ctx.config)?.provider == Provider::Live {
            crate::install_rustls_crypto_provider();
            price_stream::spawn_upstream(hub.clone());
        }
        ctx.shared_store.insert(hub);
        Ok(())
    }
}
