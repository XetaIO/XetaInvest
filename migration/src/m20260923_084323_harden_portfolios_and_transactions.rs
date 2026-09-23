use sea_orm_migration::prelude::*;

/// Moves invariants the application already enforces into the schema:
///
/// - `portfolios.name` is required (backfilled for legacy rows) and unique per user;
/// - `transactions.kind` only accepts `buy` / `sell`.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, m: &SchemaManager) -> Result<(), DbErr> {
        let db = m.get_connection();

        db.execute_unprepared(
            "UPDATE portfolios SET name = 'Portfolio ' || id WHERE name IS NULL OR trim(name) = ''",
        )
        .await?;
        m.alter_table(
            Table::alter()
                .table(Portfolios::Table)
                .modify_column(ColumnDef::new(Portfolios::Name).string().not_null())
                .to_owned(),
        )
        .await?;
        m.create_index(
            Index::create()
                .unique()
                .name(PORTFOLIOS_USER_NAME_INDEX)
                .table(Portfolios::Table)
                .col(Portfolios::UserId)
                .col(Portfolios::Name)
                .to_owned(),
        )
        .await?;

        db.execute_unprepared("UPDATE transactions SET kind = lower(trim(kind))")
            .await?;
        db.execute_unprepared(&format!(
            "ALTER TABLE transactions ADD CONSTRAINT {TRANSACTIONS_KIND_CHECK} \
             CHECK (kind IN ('buy', 'sell'))"
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, m: &SchemaManager) -> Result<(), DbErr> {
        let db = m.get_connection();

        db.execute_unprepared(&format!(
            "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS {TRANSACTIONS_KIND_CHECK}"
        ))
        .await?;
        m.drop_index(
            Index::drop()
                .name(PORTFOLIOS_USER_NAME_INDEX)
                .table(Portfolios::Table)
                .to_owned(),
        )
        .await?;
        m.alter_table(
            Table::alter()
                .table(Portfolios::Table)
                .modify_column(ColumnDef::new(Portfolios::Name).string().null())
                .to_owned(),
        )
        .await
    }
}

const PORTFOLIOS_USER_NAME_INDEX: &str = "uniq_portfolios_user_name";
const TRANSACTIONS_KIND_CHECK: &str = "chk_transactions_kind";

#[derive(DeriveIden)]
enum Portfolios {
    Table,
    Name,
    UserId,
}
