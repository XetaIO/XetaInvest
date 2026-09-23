use std::fmt;

/// Failures from the market-data provider (crate or mock).
///
/// Distinct from HTTP errors: the controller decides whether to turn this
/// into `[]` (search) or 503 (quotes).
#[derive(Debug)]
pub enum MarketError {
    /// The crate (or mock) could not fulfill the request.
    Upstream(String),
}

impl fmt::Display for MarketError {
    /// Formats the upstream message.
    ///
    /// Returns `fmt` result.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Upstream(message) => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for MarketError {}
