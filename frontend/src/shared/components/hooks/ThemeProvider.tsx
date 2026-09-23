import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { ThemeContext } from './useTheme';
import type { Theme } from './useTheme';

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // This code will only run on the client side
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const initialTheme = savedTheme || 'light'; // Default to light theme

        setTheme(initialTheme);
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('theme', theme);
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, [theme, isInitialized]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
