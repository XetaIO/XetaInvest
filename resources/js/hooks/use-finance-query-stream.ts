import { useEffect, useMemo, useRef } from 'react';
import type { PriceUpdate } from '@/types';

type Options = {
    symbols: string[];
    wsUrl: string;
    onUpdate: (update: PriceUpdate) => void;
    enabled?: boolean;
};

type RawPriceUpdate = {
    id?: unknown;
    price?: unknown;
    change?: unknown;
    changePercent?: unknown;
    change_percent?: unknown;
    dayHigh?: unknown;
    day_high?: unknown;
    dayLow?: unknown;
    day_low?: unknown;
    dayVolume?: unknown;
    day_volume?: unknown;
    openPrice?: unknown;
    open_price?: unknown;
    previousClose?: unknown;
    previous_close?: unknown;
    shortName?: unknown;
    short_name?: unknown;
    currency?: unknown;
    exchange?: unknown;
    quoteType?: unknown;
    quote_type?: unknown;
    marketHours?: unknown;
    market_hours?: unknown;
    time?: unknown;
};

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

function normalizePriceUpdate(raw: unknown): PriceUpdate | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const r = raw as RawPriceUpdate;

    const id = str(r.id);

    if (!id) {
        return null;
    }

    const price = num(r.price) ?? 0;
    const change = num(r.change) ?? 0;
    const changePercent = num(r.changePercent) ?? num(r.change_percent) ?? 0;

    let time: string | undefined;
    const t = r.time;

    if (typeof t === 'number' && Number.isFinite(t)) {
        time = new Date(t).toISOString();
    } else if (typeof t === 'string' && t.length > 0) {
        time = t;
    }

    return {
        id,
        price,
        change,
        change_percent: changePercent,
        day_high: num(r.dayHigh) ?? num(r.day_high),
        day_low: num(r.dayLow) ?? num(r.day_low),
        day_volume: num(r.dayVolume) ?? num(r.day_volume),
        open_price: num(r.openPrice) ?? num(r.open_price),
        previous_close: num(r.previousClose) ?? num(r.previous_close),
        short_name: str(r.shortName) ?? str(r.short_name),
        currency: str(r.currency),
        exchange: str(r.exchange),
        quote_type: str(r.quoteType) ?? str(r.quote_type),
        market_hours: str(r.marketHours) ?? str(r.market_hours),
        time,
    };
}

export function useFinanceQueryStream({ symbols, wsUrl, onUpdate, enabled = true }: Options) {
    const wsRef = useRef<WebSocket | null>(null);
    const subscribedRef = useRef<Set<string>>(new Set());
    const reconnectDelayRef = useRef<number>(3000);
    const reconnectTimerRef = useRef<number | null>(null);
    const closedByUsRef = useRef<boolean>(false);
    const onUpdateRef = useRef(onUpdate);
    const syncSubscriptionsRef = useRef<() => void>(() => { });

    const symbolsKey = useMemo(
        () => symbols.map((s) => s.toUpperCase()).sort().join('|'),
        [symbols],
    );

    useEffect(() => {
        syncSubscriptionsRef.current = () => {
            const ws = wsRef.current;

            if (!ws || ws.readyState !== WebSocket.OPEN) {
                return;
            }

            const desired = new Set(symbols.map((s) => s.toUpperCase()));
            const current = subscribedRef.current;

            const toAdd = [...desired].filter((s) => !current.has(s));
            const toRemove = [...current].filter((s) => !desired.has(s));

            if (toAdd.length > 0) {
                ws.send(JSON.stringify({ subscribe: toAdd }));
                toAdd.forEach((s) => current.add(s));
            }

            if (toRemove.length > 0) {
                ws.send(JSON.stringify({ unsubscribe: toRemove }));
                toRemove.forEach((s) => current.delete(s));
            }
        };
    });

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        if (!enabled || !wsUrl) {
            return;
        }

        closedByUsRef.current = false;

        const connect = () => {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (closedByUsRef.current) {
                    ws.close();

                    return;
                }

                reconnectDelayRef.current = 3000;
                subscribedRef.current = new Set();
                syncSubscriptionsRef.current();
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string) as unknown;
                    const updates = Array.isArray(data) ? data : [data];

                    for (const raw of updates) {
                        const u = normalizePriceUpdate(raw);

                        if (!u) {
                            continue;
                        }

                        if (u.quote_type === 'HEARTBEAT') {
                            continue;
                        }

                        if (!u.id) {
                            continue;
                        }

                        onUpdateRef.current(u);
                    }
                } catch {
                    // ignore malformed
                }
            };

            ws.onclose = () => {
                wsRef.current = null;
                subscribedRef.current = new Set();

                if (closedByUsRef.current) {
                    return;
                }

                reconnectTimerRef.current = window.setTimeout(connect, reconnectDelayRef.current);
                reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
            };

            ws.onerror = () => {
                ws.close();
            };
        };

        connect();

        return () => {
            closedByUsRef.current = true;

            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }

            const ws = wsRef.current;

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }

            wsRef.current = null;
            subscribedRef.current = new Set();
        };

    }, [enabled, wsUrl]);

    useEffect(() => {
        syncSubscriptionsRef.current();

    }, [symbolsKey]);
}
