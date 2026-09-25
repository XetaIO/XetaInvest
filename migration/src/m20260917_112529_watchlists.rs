use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "watchlists",
            &[
                ("id", ColType::PkAuto),
                ("name", ColType::String),
                ("position", ColType::BigInteger),
            ],
            &[("user", "")],
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name("uniq_watchlists_user_name")
                .table(Alias::new("watchlists"))
                .col(Alias::new("user_id"))
                .col(Alias::new("name"))
                .to_owned(),
        )
        .await?;
        m.create_index(
            Index::create()
                .name("idx_watchlists_user_position")
                .table(Alias::new("watchlists"))
                .col(Alias::new("user_id"))
                .col(Alias::new("position"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "watchlists").await
    }
}
