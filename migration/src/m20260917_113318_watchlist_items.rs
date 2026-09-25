use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "watchlist_items",
            &[("id", ColType::PkAuto), ("position", ColType::BigInteger)],
            &[
                ("watchlist", ""),
                ("watchlist_section", ""),
                ("instrument", ""),
            ],
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name("uniq_watchlist_items_watchlist_instrument")
                .table(Alias::new("watchlist_items"))
                .col(Alias::new("watchlist_id"))
                .col(Alias::new("instrument_id"))
                .to_owned(),
        )
        .await?;
        m.create_index(
            Index::create()
                .name("idx_watchlist_items_section_position")
                .table(Alias::new("watchlist_items"))
                .col(Alias::new("watchlist_section_id"))
                .col(Alias::new("position"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "watchlist_items").await
    }
}
