const PARIS_TZ = 'Europe/Paris';

const eurFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

export function formatEur(value: number): string {
    return eurFormatter.format(value);
}

export function formatPercent(value: number): string {
    // Value is a percent (e.g., 12.34 means 12.34%)
    return percentFormatter.format(value / 100);
}

export function formatNumber(value: number, fractionDigits = 4): string {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    }).format(value);
}

export function formatNative(value: number, currency: string): string {
    try {
        return new Intl.NumberFormat('fr-FR', {
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

    return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? '—' : dateTimeFormatter.format(d);
}

export function formatTime(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? '—' : timeFormatter.format(d);
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
