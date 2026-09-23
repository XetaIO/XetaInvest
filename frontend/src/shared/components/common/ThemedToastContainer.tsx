import { ToastContainer } from 'react-toastify';
import { useTheme } from '../../hooks/useTheme';

export function ThemedToastContainer() {
    const { resolvedTheme } = useTheme();
    return (
        <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            pauseOnHover
            theme={resolvedTheme}
        />
    );
}
