//! Business services.
//!
//! Controllers stay HTTP-thin; actions stay write-oriented. Read/orchestration
//! and the finance-query crate wrapper live here.

pub mod dashboard;
pub mod finance_query;
pub mod instrument_resolver;
pub mod portfolio_calculator;
pub mod portfolio_valuation;
pub mod price_stream;
pub mod statistics;
pub mod symbol_page;
pub mod transaction_inventory;
pub mod watchlist_history;
pub mod watchlist_page;
