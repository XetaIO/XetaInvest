//! Reusable request validators and the conversions shared by actions.

use std::collections::{BTreeMap, HashMap};

use chrono::NaiveDate;
use loco_rs::prelude::*;
use loco_rs::validation::{ModelValidationErrors, ValidationError as LocoFieldError};
use rust_decimal::Decimal;
use sea_orm::TransactionError;
use serde::{Deserialize, Deserializer};
use validator::ValidationError;

/// Decimal places stored by `transactions.quantity` / `unit_price` (`DECIMAL(20, 4)`).
pub const AMOUNT_SCALE: u32 = 4;

/// Upper bound for a quantity or unit price.
///
/// Keeps every product computed from two amounts (and an FX rate) far below
/// `Decimal::MAX`, so KPI arithmetic cannot overflow.
pub const MAX_AMOUNT: Decimal = Decimal::from_parts(0xD4A5_1000, 0xE8, 0, false, 0); // 10^12

const ISO_DATE: &str = "%Y-%m-%d";

/// Trims a JSON string field (`#[serde(deserialize_with = "trim_string")]`).
pub fn trim_string<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let value = String::deserialize(deserializer)?;
    Ok(value.trim().to_string())
}

/// Trims an optional JSON string; blank-after-trim becomes `None`.
///
/// Use with `#[serde(default, deserialize_with = "trim_opt_string")]`.
pub fn trim_opt_string<'de, D>(deserializer: D) -> std::result::Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = Option::<String>::deserialize(deserializer)?;
    Ok(value
        .map(|s| s.trim().to_string())
        .filter(|trimmed| !trimmed.is_empty()))
}

/// Accepts a strictly positive amount with at most [`AMOUNT_SCALE`] decimals,
/// up to [`MAX_AMOUNT`].
pub fn positive_amount(value: &Decimal) -> std::result::Result<(), ValidationError> {
    if *value <= Decimal::ZERO {
        return Err(ValidationError::new("range").with_message("must be greater than 0".into()));
    }
    if *value > MAX_AMOUNT {
        return Err(ValidationError::new("range").with_message("is too large".into()));
    }
    if value.normalize().scale() > AMOUNT_SCALE {
        return Err(ValidationError::new("scale")
            .with_message(format!("must have at most {AMOUNT_SCALE} decimal places").into()));
    }
    Ok(())
}

/// Accepts a `YYYY-MM-DD` date on or before today (UTC).
pub fn iso_date_not_future(value: &str) -> std::result::Result<(), ValidationError> {
    let Ok(date) = NaiveDate::parse_from_str(value.trim(), ISO_DATE) else {
        return Err(ValidationError::new("date").with_message("must be a date (YYYY-MM-DD)".into()));
    };
    if date > chrono::Utc::now().date_naive() {
        return Err(ValidationError::new("date").with_message("must be today or earlier".into()));
    }
    Ok(())
}

/// Builds a Loco field validation error: HTTP 400 `{ errors: { field: [...] } }`.
#[must_use]
pub fn field_error(field: &str, code: &str, message: &str) -> Error {
    let mut errors = BTreeMap::new();
    errors.insert(
        field.to_string(),
        vec![LocoFieldError {
            code: code.to_string(),
            message: Some(message.to_string()),
            params: HashMap::new(),
        }],
    );
    Error::Validation(ModelValidationErrors { errors })
}

/// Flattens a Sea-ORM transaction error into the Loco [`Error`] raised inside it.
#[must_use]
pub fn from_txn(err: TransactionError<Error>) -> Error {
    match err {
        TransactionError::Connection(err) => err.into(),
        TransactionError::Transaction(err) => err,
    }
}

/// Parses a `YYYY-MM-DD` string already checked by [`iso_date_not_future`].
pub fn to_iso_date(value: &str, field: &str) -> Result<NaiveDate> {
    NaiveDate::parse_from_str(value.trim(), ISO_DATE)
        .map_err(|_| field_error(field, "date", "must be a date (YYYY-MM-DD)"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, NaiveDate, Utc};
    use rstest::rstest;
    use rust_decimal::Decimal;
    use sea_orm::{DbErr, TransactionError};

    #[derive(serde::Deserialize)]
    struct Sample {
        #[serde(deserialize_with = "trim_string")]
        name: String,
        #[serde(default, deserialize_with = "trim_opt_string")]
        notes: Option<String>,
    }

    fn parse_sample(json: &str) -> Sample {
        serde_json::from_str(json).expect("sample JSON")
    }

    fn dec(value: &str) -> Decimal {
        value.parse().expect("decimal literal")
    }

    fn assert_validator_err(err: &ValidationError, code: &str, message: &str) {
        assert_eq!(err.code, code);
        assert_eq!(err.message.as_deref(), Some(message));
    }

    fn assert_field_err(err: Error, field: &str, code: &str, message: &str) {
        match err {
            Error::Validation(errors) => {
                let first = errors
                    .errors
                    .get(field)
                    .and_then(|list| list.first())
                    .expect("field error");
                assert_eq!(first.code, code);
                assert_eq!(first.message.as_deref(), Some(message));
            }
            other => panic!("expected Error::Validation, got {other:?}"),
        }
    }

    #[rstest]
    #[case(r#"{"name":"  Core  "}"#, "Core")]
    #[case(r#"{"name":"Core"}"#, "Core")]
    #[case("{\"name\":\"\\tCore\\n\"}", "Core")]
    #[case(r#"{"name":""}"#, "")]
    #[case(r#"{"name":"  Café  "}"#, "Café")]
    fn trim_string_cases(#[case] json: &str, #[case] expected: &str) {
        assert_eq!(parse_sample(json).name, expected);
    }

    #[test]
    fn trim_string_rejects_non_string() {
        assert!(serde_json::from_str::<Sample>(r#"{"name":1}"#).is_err());
    }

    #[rstest]
    #[case(r#"{"name":"x"}"#)]
    #[case(r#"{"name":"x","notes":null}"#)]
    #[case(r#"{"name":"x","notes":"   "}"#)]
    fn trim_opt_string_missing_null_or_blank_is_none(#[case] json: &str) {
        assert_eq!(parse_sample(json).notes, None);
    }

    #[test]
    fn trim_opt_string_keeps_trimmed_value() {
        assert_eq!(
            parse_sample(r#"{"name":"x","notes":"  hello  "}"#)
                .notes
                .as_deref(),
            Some("hello")
        );
    }

    #[test]
    fn max_amount_is_one_trillion() {
        assert_eq!(MAX_AMOUNT, Decimal::from(1_000_000_000_000_i64));
    }

    #[rstest]
    #[case("0.0001")]
    #[case("0.1")]
    #[case("1")]
    #[case("12.3400000")]
    #[case("1000000000000")]
    fn positive_amount_accepts_valid_values(#[case] value: &str) {
        assert!(positive_amount(&dec(value)).is_ok());
    }

    #[rstest]
    #[case("0")]
    #[case("-0.5")]
    fn positive_amount_rejects_non_positive(#[case] value: &str) {
        assert_validator_err(
            &positive_amount(&dec(value)).unwrap_err(),
            "range",
            "must be greater than 0",
        );
    }

    #[test]
    fn positive_amount_rejects_too_large() {
        assert_validator_err(
            &positive_amount(&dec("1000000000000.0001")).unwrap_err(),
            "range",
            "is too large",
        );
    }

    #[test]
    fn positive_amount_rejects_more_than_four_decimals() {
        assert_validator_err(
            &positive_amount(&dec("0.00001")).unwrap_err(),
            "scale",
            "must have at most 4 decimal places",
        );
    }

    #[test]
    fn iso_date_not_future_accepts_today_and_past() {
        let today = Utc::now().date_naive();
        let yesterday = today - Duration::days(1);
        assert!(iso_date_not_future(&today.to_string()).is_ok());
        assert!(iso_date_not_future(&yesterday.to_string()).is_ok());
        assert!(iso_date_not_future("  2020-01-01  ").is_ok());
    }

    #[test]
    fn iso_date_not_future_rejects_tomorrow() {
        let tomorrow = Utc::now().date_naive() + Duration::days(1);
        assert_validator_err(
            &iso_date_not_future(&tomorrow.to_string()).unwrap_err(),
            "date",
            "must be today or earlier",
        );
    }

    #[rstest]
    #[case("2020/01/01")]
    #[case("not-a-date")]
    #[case("2020-01-01T00:00:00")]
    #[case("")]
    fn iso_date_not_future_rejects_invalid_format(#[case] value: &str) {
        assert_validator_err(
            &iso_date_not_future(value).unwrap_err(),
            "date",
            "must be a date (YYYY-MM-DD)",
        );
    }

    #[test]
    fn field_error_is_loco_validation_on_named_field() {
        assert_field_err(
            field_error("name", "already_taken", "Name has already been taken"),
            "name",
            "already_taken",
            "Name has already been taken",
        );
    }

    #[test]
    fn from_txn_unwraps_inner_transaction_error() {
        assert!(matches!(
            from_txn(TransactionError::Transaction(Error::NotFound)),
            Error::NotFound
        ));
    }

    #[test]
    fn from_txn_maps_connection_failure_to_db_error() {
        match from_txn(TransactionError::Connection(DbErr::Custom(
            "pool exhausted".into(),
        ))) {
            Error::DB(err) => assert!(err.to_string().contains("pool exhausted")),
            other => panic!("expected Error::DB, got {other:?}"),
        }
    }

    #[test]
    fn to_iso_date_parses_trimmed_calendar_date() {
        assert_eq!(
            to_iso_date("  2020-01-15  ", "executed_at").unwrap(),
            NaiveDate::from_ymd_opt(2020, 1, 15).unwrap()
        );
    }

    #[test]
    fn to_iso_date_rejects_invalid_format() {
        assert_field_err(
            to_iso_date("2020/01/15", "executed_at").unwrap_err(),
            "executed_at",
            "date",
            "must be a date (YYYY-MM-DD)",
        );
    }
}
