use insta::{assert_debug_snapshot, with_settings};
use loco_rs::testing::prelude::*;
use rstest::rstest;
use sea_orm::EntityTrait;
use serial_test::serial;
use xeta_invest::{app::App, models::users};

use super::prepare_data;

// TODO: see how to dedup / extract this to app-local test utils
// not to framework, because that would require a runtime dep on insta
macro_rules! configure_insta {
    ($($expr:expr),*) => {
        let mut settings = insta::Settings::clone_current();
        settings.set_prepend_module_to_snapshot(false);
        settings.set_snapshot_suffix("auth_request");
        let _guard = settings.bind_to_scope();
    };
}

#[tokio::test]
#[serial]
async fn can_register() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let email = "test@loco.com";
        let payload = serde_json::json!({
            "name": "loco",
            "email": email,
            "password": "12341234"
        });

        let response = request.post("/api/auth/register").json(&payload).await;
        assert_eq!(
            response.status_code(),
            200,
            "Register request should succeed"
        );
        let saved_user = users::Model::find_by_email(&ctx.db, email)
            .await
            .expect("registration should have persisted a user");

        // Snapshot only the fields this test is about, never the whole
        // `Model` — see the note in `tests/models/users.rs`. Anything the
        // snapshot does not cover, assert directly:
        assert!(
            saved_user.email_verification_token.is_some(),
            "registration should issue an email verification token"
        );
        assert!(
            saved_user.email_verified_at.is_none(),
            "a freshly registered user is not verified yet"
        );
        assert_debug_snapshot!((saved_user.email, saved_user.name));

        let deliveries = ctx.mailer.unwrap().deliveries();
        assert_eq!(deliveries.count, 1, "Exactly one email should be sent");

        // with_settings!({
        //     filters => cleanup_email()
        // }, {
        //     assert_debug_snapshot!(ctx.mailer.unwrap().deliveries());
        // });
    })
    .await;
}

#[rstest]
#[case("login_with_valid_password", "12341234")]
#[case("login_with_invalid_password", "invalid-password")]
#[tokio::test]
#[serial]
async fn can_login_with_verify(#[case] test_name: &str, #[case] password: &str) {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let email = "test@loco.com";
        let register_payload = serde_json::json!({
            "name": "loco",
            "email": email,
            "password": "12341234"
        });

        //Creating a new user
        let register_response = request
            .post("/api/auth/register")
            .json(&register_payload)
            .await;

        assert_eq!(
            register_response.status_code(),
            200,
            "Register request should succeed"
        );

        let user = users::Model::find_by_email(&ctx.db, email).await.unwrap();
        let email_verification_token = user
            .email_verification_token
            .expect("Email verification token should be generated");
        request
            .get(&format!("/api/auth/verify/{email_verification_token}"))
            .await;

        //verify user request
        let response = request
            .post("/api/auth/login")
            .json(&serde_json::json!({
                "email": email,
                "password": password
            }))
            .await;

        // Make sure email_verified_at is set
        let user = users::Model::find_by_email(&ctx.db, email)
            .await
            .expect("Failed to find user by email");

        assert!(
            user.email_verified_at.is_some(),
            "Expected the email to be verified, but it was not. User: {user:?}"
        );

        if response.status_code() == 200 {
            prepare_data::assert_auth_cookie(response.headers());
        }

        with_settings!({
            filters => cleanup_user_model()
        }, {
            assert_debug_snapshot!(test_name, (response.status_code(), response.text()));
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn login_with_un_existing_email() {
    configure_insta!();

    request::<App, _, _>(|request, _ctx| async move {

        let login_response = request
            .post("/api/auth/login")
            .json(&serde_json::json!({
                "email": "un_existing@loco.rs",
                "password":  "1234"
            }))
            .await;

        assert_eq!(login_response.status_code(), 401, "Login request should return 401");
        login_response.assert_json(&serde_json::json!({"error": "unauthorized", "description": "You do not have permission to access this resource"}));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_login_without_verify() {
    configure_insta!();

    request::<App, _, _>(|request, _ctx| async move {
        let email = "test@loco.com";
        let password = "12341234";
        let register_payload = serde_json::json!({
            "name": "loco",
            "email": email,
            "password": password
        });

        //Creating a new user
        let register_response = request
            .post("/api/auth/register")
            .json(&register_payload)
            .await;

        assert_eq!(
            register_response.status_code(),
            200,
            "Register request should succeed"
        );

        //verify user request
        let login_response = request
            .post("/api/auth/login")
            .json(&serde_json::json!({
                "email": email,
                "password": password
            }))
            .await;

        assert_eq!(
            login_response.status_code(),
            200,
            "Login request should succeed"
        );
        prepare_data::assert_auth_cookie(login_response.headers());

        with_settings!({
            filters => cleanup_user_model()
        }, {
            assert_debug_snapshot!(login_response.text());
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn invalid_verification_token() {
    configure_insta!();

    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/auth/verify/invalid-token").await;

        assert_eq!(response.status_code(), 401, "Verify request should reject");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_reset_password() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let login_data = prepare_data::init_user_login(&request, &ctx).await;

        let forgot_payload = serde_json::json!({
            "email": login_data.user.email,
        });
        let forget_response = request.post("/api/auth/forgot").json(&forgot_payload).await;
        assert_eq!(
            forget_response.status_code(),
            200,
            "Forget request should succeed"
        );

        let user = users::Model::find_by_email(&ctx.db, &login_data.user.email)
            .await
            .expect("Failed to find user by email");

        assert!(
            user.reset_token.is_some(),
            "Expected reset_token to be set, but it was None. User: {user:?}"
        );
        assert!(
            user.reset_sent_at.is_some(),
            "Expected reset_sent_at to be set, but it was None. User: {user:?}"
        );

        let new_password = "new-password";
        let reset_payload = serde_json::json!({
            "token": user.reset_token,
            "password": new_password,
        });

        let reset_response = request.post("/api/auth/reset").json(&reset_payload).await;
        assert_eq!(
            reset_response.status_code(),
            200,
            "Reset password request should succeed"
        );

        let user = users::Model::find_by_email(&ctx.db, &user.email)
            .await
            .unwrap();

        assert!(user.reset_token.is_none());
        assert!(user.reset_sent_at.is_none());

        assert_debug_snapshot!(reset_response.text());

        let login_response = request
            .post("/api/auth/login")
            .json(&serde_json::json!({
                "email": user.email,
                "password": new_password
            }))
            .await;

        assert_eq!(
            login_response.status_code(),
            200,
            "Login request should succeed"
        );

        let deliveries = ctx.mailer.unwrap().deliveries();
        assert_eq!(deliveries.count, 2, "Exactly one email should be sent");
        // with_settings!({
        //     filters => cleanup_email()
        // }, {
        //     assert_debug_snapshot!(deliveries.messages);
        // });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_get_current_user() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;

        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);
        let response = request
            .get("/api/auth/current")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(
            response.status_code(),
            200,
            "Current request should succeed"
        );

        with_settings!({
            filters => cleanup_user_model()
        }, {
            assert_debug_snapshot!((response.status_code(), response.text()));
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn stale_jwt_after_user_deleted_is_unauthorized() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        users::Entity::delete_by_id(user.user.id)
            .exec(&ctx.db)
            .await
            .unwrap();

        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);
        let response = request
            .get("/api/auth/current")
            .add_header(auth_key, auth_value)
            .await;

        assert_eq!(
            response.status_code(),
            401,
            "a JWT whose user was deleted must not 404 (that blocks the SPA landing page)"
        );

        let set_cookie = response
            .headers()
            .get_all("set-cookie")
            .iter()
            .filter_map(|value| value.to_str().ok())
            .find(|header| header.starts_with("auth_token="))
            .expect("stale session should expire the cookie");
        assert!(
            set_cookie.to_ascii_lowercase().contains("max-age=0"),
            "stale session cookie should expire immediately: {set_cookie}"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_logout_and_clear_auth_cookie() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;

        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);
        let current = request
            .get("/api/auth/current")
            .add_header(auth_key.clone(), auth_value.clone())
            .await;
        assert_eq!(
            current.status_code(),
            200,
            "Current request should succeed before logout"
        );

        let logout = request.post("/api/auth/logout").await;
        assert_eq!(logout.status_code(), 204, "Logout should return 204");

        let set_cookie = logout
            .headers()
            .get_all("set-cookie")
            .iter()
            .filter_map(|value| value.to_str().ok())
            .find(|header| header.starts_with("auth_token="))
            .expect("logout should Set-Cookie auth_token");
        let cookie_pair = set_cookie.split(';').next().unwrap_or(set_cookie);
        assert_eq!(
            cookie_pair, "auth_token=",
            "logout cookie value should be empty"
        );
        assert!(
            set_cookie.to_ascii_lowercase().contains("max-age=0"),
            "logout cookie should expire immediately: {set_cookie}"
        );

        let unauthenticated = request.get("/api/auth/current").await;
        assert_eq!(
            unauthenticated.status_code(),
            401,
            "Current request without cookie should be unauthorized"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_auth_with_magic_link() {
    configure_insta!();
    request::<App, _, _>(|request, ctx| async move {
        seed::<App>(&ctx).await.unwrap();

        let payload = serde_json::json!({
            "email": "user1@example.com",
        });
        let response = request.post("/api/auth/magic-link").json(&payload).await;
        assert_eq!(
            response.status_code(),
            200,
            "Magic link request should succeed"
        );

        let deliveries = ctx.mailer.unwrap().deliveries();
        assert_eq!(deliveries.count, 1, "Exactly one email should be sent");

        // let redact_token = format!("[a-zA-Z0-9]{{{}}}", users::MAGIC_LINK_LENGTH);
        // with_settings!({
        //      filters => {
        //          let mut combined_filters = cleanup_email().clone();
        //         combined_filters.extend(vec![(r"(\\r\\n|=\\r\\n)", ""), (redact_token.as_str(), "[REDACT_TOKEN]") ]);
        //         combined_filters
        //     }
        // }, {
        //     assert_debug_snapshot!(deliveries.messages);
        // });

        let user = users::Model::find_by_email(&ctx.db, "user1@example.com")
            .await
            .expect("User should be found");

        let magic_link_token = user
            .magic_link_token
            .expect("Magic link token should be generated");
        let magic_link_response = request
            .get(&format!("/api/auth/magic-link/{magic_link_token}"))
            .await;
        assert_eq!(
            magic_link_response.status_code(),
            200,
            "Magic link authentication should succeed"
        );
        prepare_data::assert_auth_cookie(magic_link_response.headers());

        with_settings!({
            filters => cleanup_user_model()
        }, {
            assert_debug_snapshot!(magic_link_response.text());
        });
    })
    .await;
}

#[tokio::test]
#[serial]
async fn magic_link_rejects_a_malformed_email() {
    configure_insta!();
    request::<App, _, _>(|request, _ctx| async move {
        let response = request
            .post("/api/auth/magic-link")
            .json(&serde_json::json!({ "email": "not-an-email" }))
            .await;
        assert_eq!(response.status_code(), 400);
        let body: serde_json::Value = serde_json::from_str(&response.text()).unwrap();
        assert!(body["errors"]["email"].is_array(), "got {body}");
    })
    .await;
}

#[tokio::test]
#[serial]
async fn magic_link_accepts_any_email_domain_without_revealing_accounts() {
    configure_insta!();
    request::<App, _, _>(|request, ctx| async move {
        let response = request
            .post("/api/auth/magic-link")
            .json(&serde_json::json!({ "email": "someone@temp-mail.com" }))
            .await;
        assert_eq!(response.status_code(), 200);
        assert_eq!(
            ctx.mailer.unwrap().deliveries().count,
            0,
            "unknown accounts must not receive mail"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_reject_invalid_magic_link_token() {
    configure_insta!();
    request::<App, _, _>(|request, ctx| async move {
        seed::<App>(&ctx).await.unwrap();

        let magic_link_response = request.get("/api/auth/magic-link/invalid-token").await;
        assert_eq!(
            magic_link_response.status_code(),
            401,
            "Magic link authentication should be rejected"
        );
    })
    .await;
}

#[tokio::test]
#[serial]
async fn can_resend_verification_email() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let email = "test@loco.com";
        let payload = serde_json::json!({
            "name": "loco",
            "email": email,
            "password": "12341234"
        });

        let response = request.post("/api/auth/register").json(&payload).await;
        assert_eq!(
            response.status_code(),
            200,
            "Register request should succeed"
        );

        let resend_payload = serde_json::json!({ "email": email });

        let resend_response = request
            .post("/api/auth/resend-verification-mail")
            .json(&resend_payload)
            .await;

        assert_eq!(
            resend_response.status_code(),
            200,
            "Resend verification email should succeed"
        );

        let deliveries = ctx.mailer.unwrap().deliveries();

        assert_eq!(
            deliveries.count, 2,
            "Two emails should have been sent: welcome and re-verification"
        );

        let user = users::Model::find_by_email(&ctx.db, email)
            .await
            .expect("User should exist");

        // Narrowed on purpose — see the note in `tests/models/users.rs`.
        assert!(
            user.email_verification_token.is_some(),
            "resending should leave a verification token on the user"
        );
        assert_debug_snapshot!("resend_verification_user", (user.email, user.name));
    })
    .await;
}

#[tokio::test]
#[serial]
async fn cannot_resend_email_if_already_verified() {
    configure_insta!();

    request::<App, _, _>(|request, ctx| async move {
        let email = "verified@loco.com";
        let payload = serde_json::json!({
            "name": "verified",
            "email": email,
            "password": "12341234"
        });

        request.post("/api/auth/register").json(&payload).await;

        // Verify user
        let user = users::Model::find_by_email(&ctx.db, email).await.unwrap();
        if let Some(token) = user.email_verification_token.clone() {
            request.get(&format!("/api/auth/verify/{token}")).await;
        }

        // Try resending verification email
        let resend_payload = serde_json::json!({ "email": email });

        let resend_response = request
            .post("/api/auth/resend-verification-mail")
            .json(&resend_payload)
            .await;

        assert_eq!(
            resend_response.status_code(),
            200,
            "Should return 200 even if already verified"
        );

        let deliveries = ctx.mailer.unwrap().deliveries();
        assert_eq!(
            deliveries.count, 1,
            "Only the original welcome email should be sent"
        );
    })
    .await;
}

#[rstest]
#[case::invalid_email(serde_json::json!({ "name": "Jo", "email": "nope", "password": "12341234" }), "email")]
#[case::short_password(serde_json::json!({ "name": "Jo", "email": "jo@example.com", "password": "1234" }), "password")]
#[case::short_name(serde_json::json!({ "name": "J", "email": "jo@example.com", "password": "12341234" }), "name")]
#[tokio::test]
#[serial]
async fn register_rejects_invalid_input(#[case] payload: serde_json::Value, #[case] field: &str) {
    configure_insta!();
    request::<App, _, _>(|request, ctx| async move {
        let response = request.post("/api/auth/register").json(&payload).await;
        assert_eq!(response.status_code(), 400);
        let body: serde_json::Value = serde_json::from_str(&response.text()).unwrap();
        assert!(body["errors"][field].is_array(), "got {body}");
        assert_eq!(ctx.mailer.unwrap().deliveries().count, 0);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn protected_routes_reject_a_session_whose_user_was_deleted() {
    configure_insta!();
    request::<App, _, _>(|request, ctx| async move {
        use sea_orm::ModelTrait;

        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (key, value) = prepare_data::auth_of(&user);
        user.user.clone().delete(&ctx.db).await.unwrap();

        let response = request.get("/api/portfolios").add_header(key, value).await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}
