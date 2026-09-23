use std::path::Path;

use async_trait::async_trait;
use loco_rs::{
    Result,
    app::{AppContext, Hooks, Initializer},
    bgworker::Queue,
    boot::{BootResult, StartMode, create_app},
    config::Config,
    controller::AppRoutes,
    db::{self, truncate_table},
    environment::Environment,
    task::Tasks,
};
use migration::Migrator;

use crate::{
    controllers,
    initializers::{market_data::MarketDataInitializer, price_stream::PriceStreamInitializer},
    models::_entities::{
        instruments, portfolios, positions, transactions, users, watchlist_items,
        watchlist_sections, watchlists,
    },
    tasks,
};

pub struct App;

#[async_trait]
impl Hooks for App {
    fn app_name() -> &'static str {
        env!("CARGO_CRATE_NAME")
    }

    fn app_version() -> String {
        format!(
            "{} ({})",
            env!("CARGO_PKG_VERSION"),
            option_env!("BUILD_SHA")
                .or(option_env!("GITHUB_SHA"))
                .unwrap_or("dev")
        )
    }

    async fn boot(
        mode: StartMode,
        environment: &Environment,
        config: Config,
    ) -> Result<BootResult> {
        create_app::<Self, Migrator>(mode, environment, config).await
    }

    async fn initializers(_ctx: &AppContext) -> Result<Vec<Box<dyn Initializer>>> {
        Ok(vec![
            Box::new(MarketDataInitializer),
            Box::new(PriceStreamInitializer),
        ])
    }

    fn routes(_ctx: &AppContext) -> AppRoutes {
        AppRoutes::with_default_routes()
            .add_route(controllers::auth::routes())
            .add_route(controllers::portfolios::routes())
            .add_route(controllers::positions::routes())
            .add_route(controllers::transactions::routes())
            .add_route(controllers::dashboard::routes())
            .add_route(controllers::symbol_search::routes())
            .add_route(controllers::quotes::routes())
            .add_route(controllers::stream::routes())
            .add_route(controllers::symbols::routes())
            .add_route(controllers::watchlists::routes())
    }

    async fn connect_workers(_ctx: &AppContext, _queue: &Queue) -> Result<()> {
        Ok(())
    }

    fn register_tasks(tasks: &mut Tasks) {
        // tasks-inject (do not remove)
        tasks.register(tasks::user_create::UserCreate);
    }

    /// Children first so foreign keys never block the truncate.
    async fn truncate(ctx: &AppContext) -> Result<()> {
        truncate_table(&ctx.db, watchlist_items::Entity).await?;
        truncate_table(&ctx.db, watchlist_sections::Entity).await?;
        truncate_table(&ctx.db, watchlists::Entity).await?;
        truncate_table(&ctx.db, transactions::Entity).await?;
        truncate_table(&ctx.db, positions::Entity).await?;
        truncate_table(&ctx.db, instruments::Entity).await?;
        truncate_table(&ctx.db, portfolios::Entity).await?;
        truncate_table(&ctx.db, users::Entity).await?;
        Ok(())
    }

    async fn seed(ctx: &AppContext, base: &Path) -> Result<()> {
        db::seed::<users::ActiveModel>(&ctx.db, &base.join("users.yaml").display().to_string())
            .await?;
        Ok(())
    }
}
