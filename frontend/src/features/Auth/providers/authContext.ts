import { createContext } from 'react';
import type { CurrentUser, LoginCredentials } from '../api/session';

export interface AuthContextValue {
    user: CurrentUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: Error | null;
    isLoggingIn: boolean;
    isLoggingOut: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    acknowledgeLogout: () => void;
    refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
    undefined,
);
