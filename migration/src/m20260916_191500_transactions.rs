use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "transactions",
            &[
                ("id", ColType::PkAuto),
                ("kind", ColType::String),
                ("quantity", ColType::DecimalLen(20, 4)),
                ("unit_price", ColType::DecimalLen(20, 4)),
                ("executed_at", ColType::Date),
                ("notes", ColType::StringNull),
            ],
            &[("position", "")],
        )
        .await?;
        m.create_index(
            Index::create()
                .name("idx_transactions_position_executed_at")
                .table(Alias::new("transactions"))
                .col(Alias::new("position_id"))
                .col(Alias::new("executed_at"))
                .to_owned(),
        )
        .await?;
        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "transactions").await
    }
}
