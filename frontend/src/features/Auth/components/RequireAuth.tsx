import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '../../../shared/components/common/LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import { SessionError } from './SessionError';

export function RequireAuth() {
    const { isAuthenticated, isLoading, isLoggingOut, error } = useAuth();
    const location = useLocation();

    if (isLoading) return <LoadingScreen />;
    if (error) return <SessionError />;

    if (!isAuthenticated) {
        if (isLoggingOut) {
            return <Navigate to="/" replace />;
        }
        return (
            <Navigate
                to="/login"
                state={{
                    from: location.pathname + location.search + location.hash,
                }}
                replace
            />
        );
    }
    return <Outlet />;
}
