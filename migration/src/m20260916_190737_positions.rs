use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "positions",
            &[("id", ColType::PkAuto)],
            &[("portfolio", ""), ("instrument", "")],
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name("uniq_positions_portfolio_instrument")
                .table(Alias::new("positions"))
                .col(Alias::new("portfolio_id"))
                .col(Alias::new("instrument_id"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "positions").await
    }
}
