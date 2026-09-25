use loco_rs::schema::*;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        create_table(
            m,
            "instruments",
            &[
                ("id", ColType::PkAuto),
                ("symbol", ColType::StringUniq),
                ("name", ColType::String),
                ("exchange", ColType::StringNull),
                ("quote_type", ColType::StringNull),
                ("currency", ColType::StringWithDefault("USD".to_string())),
                ("last_synced_at", ColType::TimestampWithTimeZoneNull),
            ],
            &[],
        )
        .await
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        drop_table(m, "instruments").await
    }
}
