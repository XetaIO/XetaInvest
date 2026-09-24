//! Registers the [`PriceHub`] and, with the live provider, its upstream stream.
//!
//! The hub is registered in every process (tasks and workers can read it),
//! but the upstream Yahoo stream only opens in processes that serve HTTP:
//! `after_routes` is not called by `start --worker --scheduler` nor by tasks.

use async_trait::async_trait;
use axum::Router as AxumRouter;
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
        ctx.shared_store.insert(PriceHub::new());
        Ok(())
    }

    async fn after_routes(&self, router: AxumRouter, ctx: &AppContext) -> Result<AxumRouter> {
        if MarketDataSettings::from_config(&ctx.config)?.provider == Provider::Live
            && let Some(hub) = ctx.shared_store.get::<PriceHub>()
        {
            crate::install_rustls_crypto_provider();
            price_stream::spawn_upstream(hub);
        }
        Ok(router)
    }
}
