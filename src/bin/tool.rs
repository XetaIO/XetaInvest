use loco_rs::cli;
use migration::Migrator;
use xeta_invest::app::App;

#[tokio::main]
async fn main() -> loco_rs::Result<()> {
    xeta_invest::install_rustls_crypto_provider();
    cli::main::<App, Migrator>().await
}
