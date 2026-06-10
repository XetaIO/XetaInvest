import type { SymbolRange } from '@/types/symbol';

// ─── Chart  ────────────────────────────────────────────────────────────

export const CHART_COLORS = {
    POSITIVE: '#10b981',
    NEGATIVE: '#ef4444',
    NEUTRAL: '#6b7280',
    /** 10-item categorical palette shared by watchlist, sankey, allocation charts */
    PALETTE: [
        '#0ea5e9',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
        '#14b8a6',
        '#f97316',
        '#6366f1',
        '#84cc16',
    ],
} as const;

export const CHART_MARGINS = {
    DEFAULT: { left: 12, right: 12, top: 8, bottom: 0 },
} as const;

/** Human-readable range labels (UI language is FR) */
export const CHART_RANGE_LABELS: Record<SymbolRange, string> = {
    '1d': '1J',
    '5d': '5J',
    '1mo': '1M',
    '3mo': '3M',
    '6mo': '6M',
    '1y': '1A',
    '2y': '2A',
    '5y': '5A',
    '10y': '10A',
    ytd: 'YTD',
};

// ─── Timing constants ─────────────────────────────────────────────────────────

/** Debounce delay for budget autosave (ms) */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Dashboard auto-refresh interval (ms) */
export const AUTO_REFRESH_INTERVAL_MS = 60_000;

// ─── Watchlist stream constants ───────────────────────────────────────────────

/** Maximum data points kept per symbol in the watchlist live chart */
export const WATCHLIST_MAX_POINTS = 600;

/** Maximum age for a price update before it is discarded (ms) */
export const WATCHLIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// ─── Misc ─────────────────────────────────────────────────────────────

/** Supported symbol types for search and display */
export const TAB_ORDER = [
    'equity',
    'etf',
    'mutualfund',
    'cryptocurrency',
    'index',
    'future',
    'currency',
] as const;
