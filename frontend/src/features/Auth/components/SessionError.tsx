import { useAuth } from '../hooks/useAuth';

export function SessionError() {
    const { refreshSession } = useAuth();
    return (
        <div role="alert">
            <p>Unable to check your session. Please try again.</p>
            <button type="button" onClick={() => void refreshSession()}>
                Try again
            </button>
        </div>
    );
}
