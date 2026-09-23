pub mod actions;
pub mod app;
pub mod controllers;
pub mod dtos;
pub mod initializers;
pub mod mailers;
pub mod models;
pub mod services;
pub mod tasks;
pub mod validation;
pub mod views;

/// Selects the process-wide rustls backend (`ring`).
///
/// rustls 0.23 panics on the first TLS handshake when both `ring` and
/// `aws-lc-rs` are enabled in the crate graph (Yahoo `wss://` via
/// `PriceStream`). Safe to call more than once.
pub fn install_rustls_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

#[cfg(test)]
mod tests {
    #[test]
    fn rustls_crypto_provider_installs() {
        super::install_rustls_crypto_provider();
        super::install_rustls_crypto_provider();
        assert!(
            rustls::crypto::CryptoProvider::get_default().is_some(),
            "ring must be the process-wide rustls backend"
        );
    }
}
