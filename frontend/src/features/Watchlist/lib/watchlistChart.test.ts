import { describe, expect, it } from 'vitest';
import type { ChartPointDto } from '../../../bindings/ChartPointDto';
import { normalizeChartPoints, toChartTime } from './watchlistChart';

function point(date: string, close: number): ChartPointDto {
    return { date, close, open: close, high: close, low: close, volume: null };
}

describe('normalizeChartPoints', () => {
    it('expresses later closes as percent from the first close', () => {
        expect(
            normalizeChartPoints([
                point('1', 100),
                point('2', 110),
                point('3', 90),
            ]),
        ).toEqual([
            { time: '1', value: 0 },
            { time: '2', value: 10 },
            { time: '3', value: -10 },
        ]);
    });

    it('returns an empty series when there is no usable baseline', () => {
        expect(normalizeChartPoints([])).toEqual([]);
        expect(normalizeChartPoints([point('1', 0)])).toEqual([]);
    });
});

describe('toChartTime', () => {
    it('keeps unix-second strings as UTC timestamps', () => {
        expect(toChartTime('1710000000')).toBe(1710000000);
    });

    it('leaves business-day strings unchanged', () => {
        expect(toChartTime('2024-03-15')).toBe('2024-03-15');
    });
});
