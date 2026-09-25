use axum::http::{HeaderMap, HeaderName, HeaderValue, header::SET_COOKIE};
use loco_rs::{TestServer, app::AppContext};
use xeta_invest::models::users;

const USER_EMAIL: &str = "test@loco.com";
const USER_PASSWORD: &str = "12341234";
const AUTH_COOKIE_NAME: &str = "auth_token";

pub struct LoggedInUser {
    pub user: users::Model,
    pub token: String,
}

pub async fn init_user_login(request: &TestServer, ctx: &AppContext) -> LoggedInUser {
    init_user_login_with(request, ctx, "loco", USER_EMAIL, USER_PASSWORD).await
}

/// Registers, logs in, and returns the cookie JWT for an arbitrary account.
///
/// Returns persisted user plus session token.
pub async fn init_user_login_with(
    request: &TestServer,
    ctx: &AppContext,
    name: &str,
    email: &str,
    password: &str,
) -> LoggedInUser {
    let register_payload = serde_json::json!({
        "name": name,
        "email": email,
        "password": password
    });

    request
        .post("/api/auth/register")
        .json(&register_payload)
        .await;
    let user = users::Model::find_by_email(&ctx.db, email).await.unwrap();

    if let Some(token) = &user.email_verification_token {
        request.get(&format!("/api/auth/verify/{token}")).await;
    }

    let response = request
        .post("/api/auth/login")
        .json(&serde_json::json!({
            "email": email,
            "password": password
        }))
        .await;

    LoggedInUser {
        user: users::Model::find_by_email(&ctx.db, email).await.unwrap(),
        token: session_token(response.headers()),
    }
}

pub fn session_token(headers: &HeaderMap) -> String {
    assert_auth_cookie(headers);
    cookie_value(headers, AUTH_COOKIE_NAME)
}

pub fn assert_auth_cookie(headers: &HeaderMap) {
    let header = set_cookie_header(headers, AUTH_COOKIE_NAME);
    let lower = header.to_ascii_lowercase();
    assert!(
        lower.contains("httponly"),
        "auth cookie must be HttpOnly: {header}"
    );
    assert!(
        lower.contains("path=/"),
        "auth cookie must be scoped to Path=/: {header}"
    );
    assert!(
        !cookie_value(headers, AUTH_COOKIE_NAME).is_empty(),
        "auth cookie must contain a JWT"
    );
}

/// Cookie header carrying `user`'s session.
pub fn auth_of(user: &LoggedInUser) -> (HeaderName, HeaderValue) {
    auth_header(&user.token)
}

pub fn auth_header(token: &str) -> (HeaderName, HeaderValue) {
    let auth_header_value = HeaderValue::from_str(&format!("{AUTH_COOKIE_NAME}={token}")).unwrap();

    (HeaderName::from_static("cookie"), auth_header_value)
}

fn set_cookie_header(headers: &HeaderMap, name: &str) -> String {
    let prefix = format!("{name}=");
    headers
        .get_all(SET_COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .find(|header| {
            header
                .split(';')
                .next()
                .is_some_and(|pair| pair.starts_with(&prefix))
        })
        .unwrap_or_else(|| panic!("missing {name} Set-Cookie"))
        .to_string()
}

fn cookie_value(headers: &HeaderMap, name: &str) -> String {
    let header = set_cookie_header(headers, name);
    header
        .split(';')
        .next()
        .and_then(|pair| pair.split_once('='))
        .map_or_else(
            || panic!("invalid {name} Set-Cookie"),
            |(_, value)| value.to_string(),
        )
}
