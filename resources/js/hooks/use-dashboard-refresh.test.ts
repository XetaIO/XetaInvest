import { router } from '@inertiajs/react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDashboardRefresh } from './use-dashboard-refresh';

vi.mock('@inertiajs/react', () => ({
    router: {
        reload: vi.fn(),
        visit: vi.fn(),
    },
}));

describe('useDashboardRefresh', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('does not schedule reload when portfolioId is undefined', () => {
        vi.useFakeTimers();

        renderHook(() => useDashboardRefresh(undefined));

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(router.reload).not.toHaveBeenCalled();
    });

    it('reloads active props on interval when tab is visible', () => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });

        renderHook(() => useDashboardRefresh(42));

        act(() => {
            vi.advanceTimersByTime(60_000);
        });

        expect(router.reload).toHaveBeenCalledWith({ only: ['active'] });
    });

    it('refresh visits dashboard with refresh query', () => {
        const { result } = renderHook(() => useDashboardRefresh(42));

        act(() => {
            result.current.refresh();
        });

        expect(router.visit).toHaveBeenCalled();
    });
});
