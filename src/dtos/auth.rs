//! Request bodies of the `/api/auth` endpoints.

use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::validation::rules::trim_string;

/// Minimum password length for new and reset passwords.
pub const PASSWORD_MIN_LENGTH: u64 = 8;

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct RegisterParams {
    #[serde(deserialize_with = "trim_string")]
    #[validate(email(message = "must be a valid email address"))]
    pub email: String,
    #[validate(length(min = "PASSWORD_MIN_LENGTH", message = "must be at least 8 characters"))]
    pub password: String,
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 2, max = 255, message = "must be between 2 and 255 characters"))]
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct LoginParams {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, message = "is required"))]
    pub email: String,
    #[validate(length(min = 1, message = "is required"))]
    pub password: String,
}

/// Body of the endpoints that only take an email (forgot, magic link, resend).
#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct EmailParams {
    #[serde(deserialize_with = "trim_string")]
    #[validate(email(message = "must be a valid email address"))]
    pub email: String,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct ResetParams {
    #[validate(length(min = 1, message = "is required"))]
    pub token: String,
    #[validate(length(min = "PASSWORD_MIN_LENGTH", message = "must be at least 8 characters"))]
    pub password: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn register(email: &str, password: &str, name: &str) -> RegisterParams {
        RegisterParams {
            email: email.into(),
            password: password.into(),
            name: name.into(),
        }
    }

    #[test]
    fn register_accepts_a_valid_account() {
        assert!(register("a@b.fr", "12345678", "Jo").validate().is_ok());
    }

    #[test]
    fn register_rejects_invalid_fields() {
        let errors = register("not-an-email", "short", "J")
            .validate()
            .unwrap_err();
        let fields = errors.field_errors();
        assert!(fields.contains_key("email"));
        assert!(fields.contains_key("password"));
        assert!(fields.contains_key("name"));
    }

    #[test]
    fn reset_requires_a_long_enough_password() {
        let params = ResetParams {
            token: "t".into(),
            password: "1234".into(),
        };
        assert!(
            params
                .validate()
                .unwrap_err()
                .field_errors()
                .contains_key("password")
        );
    }
}
