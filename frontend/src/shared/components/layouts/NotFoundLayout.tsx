import { SessionError } from '../../../features/Auth/components/SessionError';
import { useAuth } from '../../../features/Auth/hooks/useAuth';
import { AppLayout } from './AppLayout';
import { AuthLayout } from './AuthLayout';

export function NotFoundLayout() {
    const { isAuthenticated, error } = useAuth();

    if (error) return <SessionError />;

    return isAuthenticated ? <AuthLayout /> : <AppLayout />;
}
