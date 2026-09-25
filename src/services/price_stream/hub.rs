use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};

use tokio::sync::mpsc::{self, error::TrySendError};

use crate::dtos::market::PriceTickDto;
use crate::services::finance_query::parse_symbols;

/// Max tickers a single browser connection may follow.
pub const MAX_SYMBOLS_PER_CLIENT: usize = 50;

/// Ticks buffered per connection before a slow consumer starts losing them.
pub const CLIENT_BUFFER: usize = 256;

struct Client {
    symbols: HashSet<String>,
    tx: mpsc::Sender<PriceTickDto>,
}

#[derive(Default)]
struct Inner {
    next_id: u64,
    clients: HashMap<u64, Client>,
    /// Notified whenever the union of subscribed symbols changes.
    on_union_change: Option<mpsc::UnboundedSender<HashSet<String>>>,
}

impl Inner {
    fn emit_union(&self) {
        let Some(tx) = self.on_union_change.as_ref() else {
            return;
        };
        let union = self
            .clients
            .values()
            .flat_map(|client| client.symbols.iter().cloned())
            .collect();
        // The upstream task only stops when the process does.
        let _ = tx.send(union);
    }
}

/// In-process fan-out: one upstream price stream, many browser sockets.
///
/// Shared through `ctx.shared_store` (see [`crate::initializers::price_stream`]).
#[derive(Clone, Default)]
pub struct PriceHub {
    inner: Arc<Mutex<Inner>>,
}

impl PriceHub {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Registers a browser connection; returns its id for later calls.
    #[must_use]
    pub fn connect(&self, tx: mpsc::Sender<PriceTickDto>) -> u64 {
        let mut inner = self.lock();
        inner.next_id += 1;
        let id = inner.next_id;
        inner.clients.insert(
            id,
            Client {
                symbols: HashSet::new(),
                tx,
            },
        );
        id
    }

    /// Adds tickers (uppercased) to a connection's filter, up to
    /// [`MAX_SYMBOLS_PER_CLIENT`]; extra tickers are ignored.
    pub fn subscribe(&self, client_id: u64, symbols: &[String]) {
        self.update_client(client_id, |client| {
            for symbol in parse_symbols(&symbols.join(",")) {
                if client.symbols.len() >= MAX_SYMBOLS_PER_CLIENT {
                    break;
                }
                client.symbols.insert(symbol);
            }
        });
    }

    /// Removes tickers from a connection's filter.
    pub fn unsubscribe(&self, client_id: u64, symbols: &[String]) {
        self.update_client(client_id, |client| {
            for symbol in parse_symbols(&symbols.join(",")) {
                client.symbols.remove(&symbol);
            }
        });
    }

    /// Forgets a connection once its socket is closed.
    pub fn disconnect(&self, client_id: u64) {
        let mut inner = self.lock();
        inner.clients.remove(&client_id);
        inner.emit_union();
    }

    /// Sends `tick` to every connection following `tick.id`.
    ///
    /// A full buffer drops the tick for that (slow) connection only; closed
    /// connections are forgotten.
    pub fn publish(&self, tick: &PriceTickDto) {
        let symbol = tick.id.to_ascii_uppercase();
        let mut inner = self.lock();
        let mut closed = Vec::new();
        for (id, client) in &inner.clients {
            if !client.symbols.contains(&symbol) {
                continue;
            }
            if let Err(TrySendError::Closed(_)) = client.tx.try_send(tick.clone()) {
                closed.push(*id);
            }
        }
        if !closed.is_empty() {
            for id in closed {
                inner.clients.remove(&id);
            }
            inner.emit_union();
        }
    }

    /// Registers the upstream task, which follows the union of subscribed symbols.
    pub fn set_union_listener(&self, tx: mpsc::UnboundedSender<HashSet<String>>) {
        let mut inner = self.lock();
        inner.on_union_change = Some(tx);
        inner.emit_union();
    }

    fn update_client(&self, client_id: u64, update: impl FnOnce(&mut Client)) {
        let mut inner = self.lock();
        if let Some(client) = inner.clients.get_mut(&client_id) {
            update(client);
        }
        inner.emit_union();
    }

    /// The state stays consistent even if a holder panicked, so poisoning is ignored.
    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tick(id: &str, price: f64) -> PriceTickDto {
        PriceTickDto {
            id: id.into(),
            price,
            change: 1.0,
            change_percent: 0.5,
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
        }
    }

    fn symbols(values: &[&str]) -> Vec<String> {
        values.iter().map(ToString::to_string).collect()
    }

    fn price_of(rx: &mut mpsc::Receiver<PriceTickDto>) -> f64 {
        rx.try_recv().expect("a tick").price
    }

    #[test]
    fn fan_out_reaches_only_subscribers_of_that_symbol() {
        let hub = PriceHub::new();
        let (aapl_tx, mut aapl_rx) = mpsc::channel(CLIENT_BUFFER);
        let (msft_tx, mut msft_rx) = mpsc::channel(CLIENT_BUFFER);
        let aapl = hub.connect(aapl_tx);
        let msft = hub.connect(msft_tx);
        hub.subscribe(aapl, &symbols(&["aapl"]));
        hub.subscribe(msft, &symbols(&["MSFT"]));

        hub.publish(&tick("AAPL", 190.0));
        assert_eq!(aapl_rx.try_recv().unwrap().id, "AAPL");
        assert!(
            msft_rx.try_recv().is_err(),
            "MSFT client must not receive AAPL"
        );

        hub.publish(&tick("MSFT", 400.0));
        assert!(aapl_rx.try_recv().is_err());
        assert_eq!(msft_rx.try_recv().unwrap().id, "MSFT");
    }

    #[test]
    fn unsubscribe_stops_delivery() {
        let hub = PriceHub::new();
        let (tx, mut rx) = mpsc::channel(CLIENT_BUFFER);
        let id = hub.connect(tx);
        hub.subscribe(id, &symbols(&["AAPL", "MSFT"]));
        hub.unsubscribe(id, &symbols(&["AAPL"]));
        hub.publish(&tick("AAPL", 1.0));
        assert!(rx.try_recv().is_err());
        hub.publish(&tick("MSFT", 2.0));
        assert!((price_of(&mut rx) - 2.0).abs() < f64::EPSILON);
    }

    #[test]
    fn subscriptions_are_capped_per_client() {
        let hub = PriceHub::new();
        let (tx, _rx) = mpsc::channel(CLIENT_BUFFER);
        let (union_tx, mut union_rx) = mpsc::unbounded_channel();
        hub.set_union_listener(union_tx);
        let id = hub.connect(tx);

        let many: Vec<String> = (0..80).map(|n| format!("T{n}")).collect();
        for chunk in many.chunks(20) {
            hub.subscribe(id, chunk);
        }

        let mut last = HashSet::new();
        while let Ok(union) = union_rx.try_recv() {
            last = union;
        }
        assert_eq!(last.len(), MAX_SYMBOLS_PER_CLIENT);
    }

    #[test]
    fn slow_consumer_loses_ticks_but_stays_connected() {
        let hub = PriceHub::new();
        let (tx, mut rx) = mpsc::channel(1);
        let id = hub.connect(tx);
        hub.subscribe(id, &symbols(&["AAPL"]));

        hub.publish(&tick("AAPL", 1.0));
        hub.publish(&tick("AAPL", 2.0));
        assert!((price_of(&mut rx) - 1.0).abs() < f64::EPSILON);
        assert!(
            rx.try_recv().is_err(),
            "the tick sent to a full buffer is dropped"
        );

        hub.publish(&tick("AAPL", 3.0));
        assert!((price_of(&mut rx) - 3.0).abs() < f64::EPSILON);
    }

    #[test]
    fn closed_connections_are_forgotten() {
        let hub = PriceHub::new();
        let (tx, rx) = mpsc::channel(CLIENT_BUFFER);
        let id = hub.connect(tx);
        hub.subscribe(id, &symbols(&["AAPL"]));
        drop(rx);

        hub.publish(&tick("AAPL", 1.0));
        assert!(hub.lock().clients.is_empty());
    }
}
