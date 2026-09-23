use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "watchlist_sections",
            &[
                ("id", ColType::PkAuto),
                ("name", ColType::String),
                ("position", ColType::BigInteger),
                ("is_default", ColType::BooleanWithDefault(false)),
            ],
            &[("watchlist", "")],
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name("uniq_watchlist_sections_watchlist_name")
                .table(Alias::new("watchlist_sections"))
                .col(Alias::new("watchlist_id"))
                .col(Alias::new("name"))
                .to_owned(),
        )
        .await?;
        m.create_index(
            Index::create()
                .name("idx_watchlist_sections_watchlist_position")
                .table(Alias::new("watchlist_sections"))
                .col(Alias::new("watchlist_id"))
                .col(Alias::new("position"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "watchlist_sections").await
    }
}
