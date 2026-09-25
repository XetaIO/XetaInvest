use std::collections::HashSet;

use finance_query::streaming::PriceStream;
use futures::StreamExt;
use tokio::sync::mpsc;

use super::hub::PriceHub;
use super::map::map_crate_tick;

/// Spawns the upstream task feeding `hub`.
///
/// The task follows the hub's union of subscribed symbols (adding and
/// removing tickers on the live stream) and publishes mapped ticks. Failures
/// are logged; the crate reconnects on its own.
pub fn spawn(hub: PriceHub) {
    let (tx, rx) = mpsc::unbounded_channel();
    hub.set_union_listener(tx);
    tokio::spawn(run(hub, rx));
}

async fn run(hub: PriceHub, mut unions: mpsc::UnboundedReceiver<HashSet<String>>) {
    let mut stream: Option<PriceStream> = None;
    let mut current: HashSet<String> = HashSet::new();

    loop {
        if let Some(ref mut live) = stream {
            tokio::select! {
                union = unions.recv() => {
                    let Some(desired) = union else { break; };
                    sync_symbols(live, &mut current, desired).await;
                    if current.is_empty() {
                        live.close().await;
                        stream = None;
                    }
                }
                tick = live.next() => {
                    let Some(update) = tick else {
                        let desired = current.clone();
                        stream = None;
                        if desired.is_empty() {
                            continue;
                        }
                        match PriceStream::subscribe(desired.iter().cloned()).await {
                            Ok(next) => stream = Some(next),
                            Err(err) => {
                                tracing::warn!(error = %err, "price stream ended and failed to resubscribe");
                            }
                        }
                        continue;
                    };
                    if let Some(mapped) = map_crate_tick(&update) {
                        hub.publish(&mapped);
                    }
                }
            }
        } else {
            let Some(desired) = unions.recv().await else {
                break;
            };
            if desired.is_empty() {
                current.clear();
                continue;
            }
            match PriceStream::subscribe(desired.iter().cloned()).await {
                Ok(live) => {
                    current = desired;
                    stream = Some(live);
                }
                Err(err) => {
                    tracing::warn!(error = %err, "price stream failed to subscribe");
                }
            }
        }
    }
}

async fn sync_symbols(
    stream: &PriceStream,
    current: &mut HashSet<String>,
    desired: HashSet<String>,
) {
    let to_add: Vec<String> = desired.difference(current).cloned().collect();
    let to_remove: Vec<String> = current.difference(&desired).cloned().collect();
    if !to_add.is_empty() {
        stream.add_symbols(to_add).await;
    }
    if !to_remove.is_empty() {
        stream.remove_symbols(to_remove).await;
    }
    *current = desired;
}
