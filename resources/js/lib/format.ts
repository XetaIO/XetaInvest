import i18n from '@/lib/i18n';

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
