//! `GET /api/stream`: live price ticks over a WebSocket.
//!
//! The cookie JWT is checked before the upgrade. The client then sends
//! `{ "subscribe": ["AAPL"] }` / `{ "unsubscribe": [...] }` frames and receives
//! JSON [`PriceTickDto`] ticks for its tickers.

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use futures::{SinkExt, StreamExt};
use loco_rs::prelude::*;
use serde::Deserialize;
use tokio::sync::mpsc;

use crate::dtos::market::PriceTickDto;
use crate::services::price_stream::{CLIENT_BUFFER, PriceHub};

#[derive(Debug, Default, Deserialize)]
struct ClientMessage {
    #[serde(default)]
    subscribe: Vec<String>,
    #[serde(default)]
    unsubscribe: Vec<String>,
}

#[debug_handler]
async fn stream(
    _auth: auth::JWT,
    ws: WebSocketUpgrade,
    State(ctx): State<AppContext>,
) -> Result<Response> {
    let hub = ctx
        .shared_store
        .get::<PriceHub>()
        .ok_or_else(|| Error::string("price hub is not registered"))?;
    Ok(ws.on_upgrade(move |socket| handle_socket(socket, hub)))
}

pub fn routes() -> Routes {
    Routes::new().prefix("/api").add("/stream", get(stream))
}

async fn handle_socket(socket: WebSocket, hub: PriceHub) {
    let (tx, mut ticks) = mpsc::channel::<PriceTickDto>(CLIENT_BUFFER);
    let client_id = hub.connect(tx);
    let (mut sender, mut receiver) = socket.split();

    loop {
        tokio::select! {
            incoming = receiver.next() => match incoming {
                Some(Ok(Message::Text(text))) => apply_client_message(&hub, client_id, &text),
                Some(Ok(Message::Ping(payload))) => {
                    if sender.send(Message::Pong(payload)).await.is_err() {
                        break;
                    }
                }
                Some(Ok(Message::Close(_)) | Err(_)) | None => break,
                Some(Ok(_)) => {}
            },
            tick = ticks.recv() => {
                let Some(tick) = tick else { break };
                let Ok(json) = serde_json::to_string(&tick) else { continue };
                if sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    }

    hub.disconnect(client_id);
}

/// Applies one `{ subscribe, unsubscribe }` frame; malformed frames are ignored.
fn apply_client_message(hub: &PriceHub, client_id: u64, text: &str) {
    let Ok(message) = serde_json::from_str::<ClientMessage>(text) else {
        return;
    };
    hub.subscribe(client_id, &message.subscribe);
    hub.unsubscribe(client_id, &message.unsubscribe);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames_update_the_subscription() {
        let hub = PriceHub::new();
        let (tx, mut rx) = mpsc::channel(CLIENT_BUFFER);
        let id = hub.connect(tx);

        apply_client_message(&hub, id, r#"{"subscribe":["aapl","msft"]}"#);
        apply_client_message(&hub, id, r#"{"unsubscribe":["MSFT"]}"#);
        apply_client_message(&hub, id, "not json");

        let tick = |symbol: &str| PriceTickDto {
            id: symbol.into(),
            price: 1.0,
            change: 0.0,
            change_percent: 0.0,
            day_high: None,
            day_low: None,
            day_volume: None,
            open_price: None,
            previous_close: None,
            short_name: None,
            currency: None,
            exchange: None,
            quote_type: None,
            market_hours: None,
            time: None,
        };
        hub.publish(&tick("MSFT"));
        hub.publish(&tick("AAPL"));
        assert_eq!(rx.try_recv().unwrap().id, "AAPL");
        assert!(rx.try_recv().is_err());
    }
}
