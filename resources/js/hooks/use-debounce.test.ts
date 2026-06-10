import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('publishes the latest value after the delay', () => {
        vi.useFakeTimers();

        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 250),
            { initialProps: { value: 'first' } },
        );

        rerender({ value: 'second' });
        expect(result.current).toBe('first');

        act(() => {
            vi.advanceTimersByTime(250);
        });

        expect(result.current).toBe('second');
    });
});
