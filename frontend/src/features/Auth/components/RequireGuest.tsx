import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '../../../shared/components/common/LoadingScreen';
import { safeRedirectPath } from '../../../shared/utils/safeRedirectPath';
import { useAuth } from '../hooks/useAuth';
import { SessionError } from './SessionError';

export function RequireGuest() {
    const {
        isAuthenticated,
        isLoading,
        isLoggingIn,
        isLoggingOut,
        error,
        acknowledgeLogout,
    } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated && isLoggingOut) {
            acknowledgeLogout();
        }
    }, [acknowledgeLogout, isAuthenticated, isLoggingOut]);

    if (isLoading) return <LoadingScreen />;
    if (error && !isLoggingIn) return <SessionError />;

    if (isAuthenticated && !isLoggingIn && !isLoggingOut) {
        return <Navigate to={safeRedirectPath(location.state?.from)} replace />;
    }
    return <Outlet />;
}
