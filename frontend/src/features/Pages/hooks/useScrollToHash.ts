import { useEffect } from 'react';
import { useLocation } from 'react-router';

export function useScrollToHash() {
    const { hash } = useLocation();

    useEffect(() => {
        if (!hash) {
            return;
        }

        const id = decodeURIComponent(hash.replace(/^#/, ''));
        if (!id) {
            return;
        }

        let cancelled = false;

        const tryScroll = (attemptsLeft: number) => {
            if (cancelled) {
                return;
            }

            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }

            if (attemptsLeft > 0) {
                requestAnimationFrame(() => tryScroll(attemptsLeft - 1));
            }
        };

        tryScroll(24);

        return () => {
            cancelled = true;
        };
    }, [hash]);
}
