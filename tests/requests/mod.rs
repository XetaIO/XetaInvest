mod auth;
mod dashboard;
mod portfolios;
mod positions;
mod prepare_data;
mod quotes;
mod statistics;
mod stream;
mod symbol_search;
mod symbols;
mod transactions;
mod watchlists;

use serde_json::Value;

/// Asserts a Loco validation payload (HTTP 400 + `errors[field]`).
fn assert_field_error(text: &str, field: &str) {
    let body: Value = serde_json::from_str(text).expect("json body");
    assert!(
        body["errors"][field].is_array(),
        "expected errors.{field}, got {body}"
    );
}
