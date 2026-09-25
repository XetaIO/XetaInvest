use sea_orm::prelude::DateTimeWithTimeZone;
use ts_rs::TS;
use validator::Validate;

use crate::validation::rules::trim_string;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct PortfolioDto {
    #[ts(type = "number")]
    pub id: i64,
    #[ts(type = "number")]
    pub user_id: i64,
    pub name: String,
    pub is_default: bool,
    #[ts(type = "string")]
    pub created_at: DateTimeWithTimeZone,
    #[ts(type = "string")]
    pub updated_at: DateTimeWithTimeZone,
}

impl From<crate::models::_entities::portfolios::Model> for PortfolioDto {
    fn from(m: crate::models::_entities::portfolios::Model) -> Self {
        Self {
            id: m.id,
            user_id: m.user_id,
            name: m.name,
            is_default: m.is_default,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct CreatePortfolio {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 255, message = "must be at most 255 characters"))]
    pub name: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Validate, TS)]
#[ts(export, export_to = "../frontend/src/bindings/")]
pub struct UpdatePortfolio {
    #[serde(deserialize_with = "trim_string")]
    #[validate(length(min = 1, max = 255, message = "must be at most 255 characters"))]
    pub name: String,
    pub is_default: Option<bool>,
}
