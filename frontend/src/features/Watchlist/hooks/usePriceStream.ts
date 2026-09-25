import { useEffect, useMemo, useRef } from 'react';
import type { PriceTickDto } from '../../../bindings/PriceTickDto';
import { normalizePriceTick, streamUrl } from '../lib/priceStream';

type Options = {
    symbols: string[];
    onUpdate: (tick: PriceTickDto) => void;
    enabled?: boolean;
    wsUrl?: string;
};

/**
 * Cookie-authenticated live ticks from `GET /api/stream`.
 *
 * Protocol matches Laravel `useFinanceQueryStream`: `{ subscribe }` /
 * `{ unsubscribe }`, reconnect backoff 3s → 30s. Heartbeats are ignored.
 */
export function usePriceStream({
    symbols,
    onUpdate,
    enabled = true,
    wsUrl,
}: Options) {
    const socketRef = useRef<WebSocket | null>(null);
    const subscribedRef = useRef<Set<string>>(new Set());
    const reconnectDelayRef = useRef(3_000);
    const reconnectTimerRef = useRef<number | null>(null);
    const closedByUsRef = useRef(false);
    const onUpdateRef = useRef(onUpdate);
    const syncRef = useRef<() => void>(() => {});
    const url = wsUrl ?? (typeof window === 'undefined' ? '' : streamUrl());

    const symbolsKey = useMemo(
        () =>
            symbols
                .map((symbol) => symbol.toUpperCase())
                .sort()
                .join('|'),
        [symbols],
    );

    useEffect(() => {
        syncRef.current = () => {
            const socket = socketRef.current;
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                return;
            }
            const desired = new Set(
                symbols.map((symbol) => symbol.toUpperCase()),
            );
            const current = subscribedRef.current;
            const toAdd = [...desired].filter((symbol) => !current.has(symbol));
            const toRemove = [...current].filter(
                (symbol) => !desired.has(symbol),
            );
            if (toAdd.length > 0) {
                socket.send(JSON.stringify({ subscribe: toAdd }));
                toAdd.forEach((symbol) => current.add(symbol));
            }
            if (toRemove.length > 0) {
                socket.send(JSON.stringify({ unsubscribe: toRemove }));
                toRemove.forEach((symbol) => current.delete(symbol));
            }
        };
    });

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        if (!enabled || !url) {
            return;
        }
        closedByUsRef.current = false;

        const connect = () => {
            const socket = new WebSocket(url);
            socketRef.current = socket;
            socket.onopen = () => {
                if (closedByUsRef.current) {
                    socket.close();
                    return;
                }
                reconnectDelayRef.current = 3_000;
                subscribedRef.current = new Set();
                syncRef.current();
            };
            socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(String(event.data)) as unknown;
                    const updates = Array.isArray(payload)
                        ? payload
                        : [payload];
                    for (const raw of updates) {
                        const tick = normalizePriceTick(raw);
                        if (tick) {
                            onUpdateRef.current(tick);
                        }
                    }
                } catch {
                    // Malformed frames are ignored.
                }
            };
            socket.onclose = () => {
                socketRef.current = null;
                subscribedRef.current = new Set();
                if (closedByUsRef.current) {
                    return;
                }
                reconnectTimerRef.current = window.setTimeout(
                    connect,
                    reconnectDelayRef.current,
                );
                reconnectDelayRef.current = Math.min(
                    reconnectDelayRef.current * 2,
                    30_000,
                );
            };
            socket.onerror = () => {
                socket.close();
            };
        };

        connect();

        return () => {
            closedByUsRef.current = true;
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }
            const socket = socketRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
            socketRef.current = null;
            subscribedRef.current = new Set();
        };
    }, [enabled, url]);

    useEffect(() => {
        syncRef.current();
    }, [symbolsKey]);
}
