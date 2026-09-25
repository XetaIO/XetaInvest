import i18n from '../../i18n';

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
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso)
        ? `${iso}T12:00:00`
        : iso;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale(), {
        timeZone: PARIS_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

export function formatTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    return new Intl.DateTimeFormat(locale(), {
        timeZone: PARIS_TZ,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);
}

export function deltaToneClass(value: number): string {
    if (value > 0) {
        return 'text-emerald-600 dark:text-emerald-400';
    }
    if (value < 0) {
        return 'text-rose-600 dark:text-rose-400';
    }
    return 'text-gray-500 dark:text-white/50';
}

/**
 * Compact market-cap / volume formatter (`3.00 T`, `50.0 M`).
 *
 * @param value Absolute figure, or `null`.
 */
export function formatLarge(value: number | null): string {
    if (value === null) {
        return '—';
    }
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000_000) {
        return `${(value / 1_000_000_000_000).toFixed(2)} T`;
    }
    if (abs >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)} B`;
    }
    if (abs >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)} M`;
    }
    if (abs >= 1_000) {
        return `${(value / 1_000).toFixed(1)} K`;
    }
    return formatNumber(value, 0);
}

/**
 * Parses a chart date that may be unix seconds, milliseconds, or ISO.
 *
 * @param value Candle `date` from the API.
 */
function parseChartDate(value: string | number): Date {
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        const n = Number(value);
        return new Date(n < 1e12 ? n * 1000 : n);
    }
    return new Date(String(value));
}

/**
 * X-axis tick for the symbol chart.
 *
 * @param value Candle date.
 * @param range Active window (`1d`, `1mo`, …).
 * @param loc BCP 47 locale.
 */
export function formatChartAxisTick(
    value: string | number,
    range: string,
    loc: string,
): string {
    const date = parseChartDate(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    if (range === '1d') {
        return new Intl.DateTimeFormat(loc, {
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }
    if (range === '5d') {
        return new Intl.DateTimeFormat(loc, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }
    if (
        range === '1mo' ||
        range === '3mo' ||
        range === '6mo' ||
        range === 'ytd'
    ) {
        return new Intl.DateTimeFormat(loc, {
            day: '2-digit',
            month: '2-digit',
        }).format(date);
    }
    return new Intl.DateTimeFormat(loc, {
        month: 'short',
        year: '2-digit',
    }).format(date);
}

/**
 * Tooltip date for the symbol chart.
 *
 * @param value Candle date.
 * @param range Active window.
 * @param loc BCP 47 locale.
 */
export function formatChartTooltipDate(
    value: string | number,
    range: string,
    loc: string,
): string {
    const date = parseChartDate(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    if (range === '1d' || range === '5d') {
        return new Intl.DateTimeFormat(loc, {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }
    return new Intl.DateTimeFormat(loc, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}
