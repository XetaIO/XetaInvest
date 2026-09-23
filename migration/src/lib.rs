#![allow(elided_lifetimes_in_paths)]
#![allow(clippy::wildcard_imports)]
pub use sea_orm_migration::prelude::*;
mod m20220101_000001_users;

mod m20260914_070717_portfolios;
mod m20260916_185450_instruments;
mod m20260916_190737_positions;
mod m20260916_191500_transactions;
mod m20260917_112529_watchlists;
mod m20260917_112950_watchlist_sections;
mod m20260917_113318_watchlist_items;
mod m20260923_084323_harden_portfolios_and_transactions;
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_users::Migration),
            Box::new(m20260914_070717_portfolios::Migration),
            Box::new(m20260916_185450_instruments::Migration),
            Box::new(m20260916_190737_positions::Migration),
            Box::new(m20260916_191500_transactions::Migration),
            Box::new(m20260917_112529_watchlists::Migration),
            Box::new(m20260917_112950_watchlist_sections::Migration),
            Box::new(m20260917_113318_watchlist_items::Migration),
            Box::new(m20260923_084323_harden_portfolios_and_transactions::Migration),
            // inject-above (do not remove this comment)
        ]
    }
}
