use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

/// Daily end-of-day valuation of a portfolio, in EUR (one row per day).
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "portfolio_snapshots",
            &[
                ("id", ColType::PkAuto),
                ("captured_on", ColType::Date),
                ("invested_eur", ColType::DecimalLen(18, 4)),
                ("current_value_eur", ColType::DecimalLen(18, 4)),
                ("pnl_eur", ColType::DecimalLen(18, 4)),
                ("position_count", ColType::SmallIntegerWithDefault(0)),
                ("quote_error", ColType::BooleanWithDefault(false)),
            ],
            &[("portfolio", "")],
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name("uniq_portfolio_snapshots_portfolio_captured_on")
                .table(Alias::new("portfolio_snapshots"))
                .col(Alias::new("portfolio_id"))
                .col(Alias::new("captured_on"))
                .to_owned(),
        )
        .await?;
        m.create_index(
            Index::create()
                .name("idx_portfolio_snapshots_captured_on")
                .table(Alias::new("portfolio_snapshots"))
                .col(Alias::new("captured_on"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "portfolio_snapshots").await
    }
}
