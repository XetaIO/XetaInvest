import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext } from './themeContext';
import type { Theme } from './themeContext';

const STORAGE_KEY = 'xeta-invest-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        /* Storage may be unavailable in private browsing. */
    }
    return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(readTheme);
    const [systemIsDark, setSystemIsDark] = useState(
        () => window.matchMedia(DARK_QUERY).matches,
    );
    const resolvedTheme =
        theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

    useEffect(() => {
        const media = window.matchMedia(DARK_QUERY);
        const update = () => setSystemIsDark(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle(
            'dark',
            resolvedTheme === 'dark',
        );
        document.documentElement.style.colorScheme = resolvedTheme;
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* Theme still works without storage. */
        }
    }, [theme, resolvedTheme]);

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
