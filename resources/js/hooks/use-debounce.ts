import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value`.
 * The returned value only updates after `delayMs` of inactivity.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebounced(value);
        }, delayMs);

        return () => {
            window.clearTimeout(id);
        };
    }, [value, delayMs]);

    return debounced;
}
