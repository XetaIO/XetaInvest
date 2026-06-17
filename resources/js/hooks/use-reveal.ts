import { useEffect, useRef, useState } from 'react';

interface UseRevealOptions {
    threshold?: number;
    rootMargin?: string;
}

const shouldRevealImmediately = (): boolean => {
    if (typeof window === 'undefined') {
        return true;
    }

    const prefersReducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return prefersReducedMotion || !('IntersectionObserver' in window);
};

export function useReveal({
    threshold = 0.15,
    rootMargin = '0px 0px -48px',
}: UseRevealOptions = {}) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(shouldRevealImmediately);

    useEffect(() => {
        if (isVisible) {
            return;
        }

        const element = ref.current;

        if (!element) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    return;
                }

                setIsVisible(true);
                observer.disconnect();
            },
            { threshold, rootMargin },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [isVisible, rootMargin, threshold]);

    return { ref, isVisible } as const;
}
