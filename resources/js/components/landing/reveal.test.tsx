import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '@/components/landing/reveal';

let observerCallback: IntersectionObserverCallback;

class IntersectionObserverMock {
    disconnect = vi.fn();
    observe = vi.fn();
    takeRecords = vi.fn(() => []);
    unobserve = vi.fn();
    root = null;
    rootMargin = '0px';
    thresholds = [0.15];

    constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
    }
}

function mockReducedMotion(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn(
            () =>
                ({
                    matches,
                    media: '(prefers-reduced-motion: reduce)',
                    onchange: null,
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                    dispatchEvent: vi.fn(),
                }) as MediaQueryList,
        ),
    });
}

describe('Reveal', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
        mockReducedMotion(false);
    });

    it('reveals content when it enters the viewport', () => {
        render(
            <Reveal>
                <span>Visible content</span>
            </Reveal>,
        );

        const wrapper = screen.getByText('Visible content').parentElement;
        expect(wrapper).toHaveAttribute('data-visible', 'false');

        act(() => {
            observerCallback(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                {} as IntersectionObserver,
            );
        });

        expect(wrapper).toHaveAttribute('data-visible', 'true');
    });

    it('reveals immediately when reduced motion is requested', () => {
        mockReducedMotion(true);

        render(
            <Reveal>
                <span>Reduced motion content</span>
            </Reveal>,
        );

        expect(
            screen.getByText('Reduced motion content').parentElement,
        ).toHaveAttribute('data-visible', 'true');
    });
});
