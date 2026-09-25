import type { HistoryPointDto } from '../../../bindings/HistoryPointDto';
import type { StatisticsScopeParam } from '../api/statistics';

export const OTHER_SLICE_KEY = '__other__';

const PIE_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];
const OTHER_COLOR = 'var(--chart-muted)';

export type AllocationItem = { key: string; label: string; value: number };
export type PieSlice = AllocationItem & { color: string };

/** Asset types with a translated label (`statistics.types.<type>`). */
const KNOWN_ASSET_TYPES = new Set([
    'stock',
    'equity',
    'etf',
    'mutualfund',
    'cryptocurrency',
    'currency',
    'index',
    'future',
    'option',
]);

/** Reads the `?portfolio=` search param: a positive id, otherwise `all`. */
export function parseScopeParam(raw: string | null): StatisticsScopeParam {
    if (raw && /^\d+$/.test(raw)) {
        const id = Number(raw);
        if (Number.isSafeInteger(id) && id > 0) {
            return id;
        }
    }
    return 'all';
}

/**
 * Donut slices: largest first, at most `maxSlices`; beyond that the tail is
 * merged into one "other" slice.
 */
export function toPieSlices(
    items: AllocationItem[],
    otherLabel: string,
    maxSlices = PIE_COLORS.length,
): PieSlice[] {
    const sorted = items
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    const kept =
        sorted.length > maxSlices ? sorted.slice(0, maxSlices - 1) : sorted;
    const slices: PieSlice[] = kept.map((item, index) => ({
        ...item,
        color: PIE_COLORS[index % PIE_COLORS.length],
    }));
    if (kept.length < sorted.length) {
        slices.push({
            key: OTHER_SLICE_KEY,
            label: otherLabel,
            value: sorted
                .slice(kept.length)
                .reduce((sum, item) => sum + item.value, 0),
            color: OTHER_COLOR,
        });
    }
    return slices;
}

/** Y domain covering value and invested lines, padded by 5% of the range. */
export function historyDomain(points: HistoryPointDto[]): [number, number] {
    const values = points.flatMap((point) => [
        point.value_eur,
        point.invested_eur,
    ]);
    if (values.length === 0) {
        return [0, 0];
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = max > min ? (max - min) * 0.05 : 0;
    return [min - padding, max + padding];
}

/** i18n key of an asset type label, or `null` when it is not translated. */
export function assetTypeKey(assetType: string): string | null {
    const normalized = assetType.toLowerCase();
    return KNOWN_ASSET_TYPES.has(normalized)
        ? `statistics.types.${normalized}`
        : null;
}
