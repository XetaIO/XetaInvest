use loco_rs::testing::prelude::*;
use serial_test::serial;
use xeta_invest::app::App;

use super::prepare_data;

#[tokio::test]
#[serial]
async fn guest_cannot_open_price_stream() {
    request::<App, _, _>(|request, _ctx| async move {
        let response = request.get("/api/stream").await;
        assert_eq!(response.status_code(), 401);
    })
    .await;
}

#[tokio::test]
#[serial]
async fn authenticated_user_passes_stream_auth() {
    request::<App, _, _>(|request, ctx| async move {
        let user = prepare_data::init_user_login(&request, &ctx).await;
        let (auth_key, auth_value) = prepare_data::auth_header(&user.token);

        let response = request
            .get("/api/stream")
            .add_header(auth_key, auth_value)
            .await;

        assert_ne!(
            response.status_code(),
            401,
            "cookie JWT must be accepted before the WebSocket upgrade"
        );
        assert!(
            response.status_code().is_client_error(),
            "without an Upgrade header the handshake must fail after auth, got {}",
            response.status_code()
        );
    })
    .await;
}
