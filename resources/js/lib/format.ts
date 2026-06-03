import i18n from '@/lib/i18n';
import type { SymbolRange } from '@/types';

const PARIS_TZ = 'Europe/Paris';

function locale(): string {
    return i18n.resolvedLanguage ?? 'fr';
}

export function formatEur(value: number): string {
    return new Intl.NumberFormat(locale(), {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatPercent(value: number): string {
    // Value is a percent (e.g., 12.34 means 12.34%)
    return new Intl.NumberFormat(locale(), {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
    }).format(value / 100);
}

export function formatNumber(value: number, fractionDigits = 4): string {
    return new Intl.NumberFormat(locale(), {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    }).format(value);
}

export function formatNative(value: number, currency: string): string {
    try {
        return new Intl.NumberFormat(locale(), {
            style: 'currency',
            currency: (currency || 'USD').toUpperCase(),
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    } catch {
        return `${formatNumber(value, 2)} ${currency}`;
    }
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(locale(), {
        timeZone: PARIS_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(locale(), {
        timeZone: PARIS_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

export function formatTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(locale(), {
        timeZone: PARIS_TZ,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(d);
}

export function deltaToneClass(value: number): string {
    if (value > 0) {
        return 'text-emerald-600 dark:text-emerald-400';
    }

    if (value < 0) {
        return 'text-rose-600 dark:text-rose-400';
    }

    return 'text-muted-foreground';
}

// ─── Signed numeric formatters ────────────────────────────────────────────────

/**
 * Formats a number with a leading '+' when positive (e.g. "+1.23", "-0.50").
 * Uses plain toFixed — intentionally locale-neutral for chart/table cells.
 */
export function formatSignedNumber(value: number, fractionDigits = 2): string {
    const sign = value > 0 ? '+' : '';

    return `${sign}${value.toFixed(fractionDigits)}`;
}

/**
 * Formats a percentage with a leading '+' when non-negative (e.g. "+1.23%", "-0.50%").
 * Uses plain toFixed — intentionally locale-neutral for chart/table cells.
 */
export function formatSignedPercent(value: number, fractionDigits = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(fractionDigits)}%`;
}

// ─── Chart date formatters ────────────────────────────────────────────────────

/**
 * Parses a chart date value that may be a Unix timestamp (seconds or ms) or an ISO string.
 */
function parseChartDate(value: string | number): Date {
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        const n = Number(value);

        // Unix seconds vs milliseconds
        return new Date(n < 1e12 ? n * 1000 : n);
    }

    return new Date(String(value));
}

/**
 * Formats a chart x-axis tick label according to the selected time range.
 * Used in SymbolChart.
 */
export function formatChartAxisTick(value: string | number, range: SymbolRange, loc: string): string {
    const d = parseChartDate(value);

    if (Number.isNaN(d.getTime())) {
        return String(value);
    }

    if (range === '1d') {
        return new Intl.DateTimeFormat(loc, {
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    if (range === '5d') {
        return new Intl.DateTimeFormat(loc, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    if (range === '1mo' || range === '3mo' || range === '6mo' || range === 'ytd') {
        return new Intl.DateTimeFormat(loc, { day: '2-digit', month: '2-digit' }).format(d);
    }

    return new Intl.DateTimeFormat(loc, { month: 'short', year: '2-digit' }).format(d);
}

/**
 * Formats a chart tooltip date label according to the selected time range.
 * Used in SymbolChart.
 */
export function formatChartTooltipDate(value: string | number, range: SymbolRange, loc: string): string {
    const d = parseChartDate(value);

    if (Number.isNaN(d.getTime())) {
        return String(value);
    }

    if (range === '1d' || range === '5d') {
        return new Intl.DateTimeFormat(loc, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    }

    return new Intl.DateTimeFormat(loc, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(d);
}

/**
 * Formats an ISO date string as a short axis label (DD/MM).
 * Used in HistoryLineChart x-axis.
 */
export function formatHistoryAxisDate(iso: string, loc: string): string {
    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return iso;
    }

    return new Intl.DateTimeFormat(loc, { day: '2-digit', month: '2-digit' }).format(d);
}

/**
 * Formats an ISO date string as a long tooltip label (e.g. "15 janvier 2025").
 * Used in HistoryLineChart tooltip.
 */
export function formatHistoryTooltipDate(iso: string, loc: string): string {
    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) {
        return iso;
    }

    return new Intl.DateTimeFormat(loc, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(d);
}
