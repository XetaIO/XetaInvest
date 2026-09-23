//! Live prices for the SPA.
//!
//! Browsers never talk to Yahoo: they open `GET /api/stream` and subscribe to
//! tickers; a single upstream `PriceStream` follows the union of those tickers
//! and the [`PriceHub`] fans its ticks out.

mod hub;
mod map;
mod upstream;

pub use hub::{CLIENT_BUFFER, MAX_SYMBOLS_PER_CLIENT, PriceHub};
pub use map::map_crate_tick;
pub use upstream::spawn as spawn_upstream;
