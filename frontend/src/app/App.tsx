import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../features/Auth/providers/AuthProvider';
import { AppRoutes } from '../routes/AppRoutes';
import { ThemedToastContainer } from '../shared/components/common/ThemedToastContainer';
import { ThemeProvider } from '../shared/providers/ThemeProvider';
import { createAppQueryClient } from './queryClient';

const queryClient = createAppQueryClient();

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <HelmetProvider>
                <ThemeProvider>
                    <AuthProvider>
                        <AppRoutes />
                        <ThemedToastContainer />
                    </AuthProvider>
                </ThemeProvider>
            </HelmetProvider>
        </QueryClientProvider>
    );
}
