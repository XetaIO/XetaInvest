import { useTheme } from '../../hooks/useTheme';

export function ThemeSelect() {
    const { theme, setTheme } = useTheme();
    return (
        <label className="theme-select">
            Theme
            <select
                value={theme}
                onChange={(event) => {
                    const value = event.target.value;
                    if (
                        value === 'light' ||
                        value === 'dark' ||
                        value === 'system'
                    )
                        setTheme(value);
                }}
            >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </label>
    );
}
