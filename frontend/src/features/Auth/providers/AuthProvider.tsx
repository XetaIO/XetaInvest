import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    AUTH_QUERY_KEY,
    clearSession,
    login,
    logout,
    sessionQueryOptions,
} from '../api/session';
import { AuthContext } from './authContext';

const logoutLocks = new WeakMap<QueryClient, boolean>();

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const session = useQuery(sessionQueryOptions());
    const user = session.data ?? null;
    const previousUserId = useRef(user?.pid);
    const [, bumpLogoutLock] = useState(0);

    useEffect(() => {
        if (previousUserId.current && previousUserId.current !== user?.pid) {
            const filters = {
                predicate: (query: { queryKey: readonly unknown[] }) =>
                    query.queryKey[0] !== 'auth',
            };
            // Cancellation happens synchronously; removed requests cannot refill the old user's cache.
            void queryClient.cancelQueries(filters);
            queryClient.removeQueries(filters);
        }
        previousUserId.current = user?.pid;
    }, [queryClient, user?.pid]);

    function setLogoutLock(locked: boolean) {
        logoutLocks.set(queryClient, locked);
        bumpLogoutLock((value) => value + 1);
    }

    const logoutMutation = useMutation({
        mutationFn: async () => {
            setLogoutLock(true);
            try {
                await logout();
                await clearSession(queryClient);
            } catch (error) {
                setLogoutLock(false);
                throw error;
            }
        },
    });

    const loginMutation = useMutation({
        meta: { skipAuthReset: true },
        mutationFn: async (credentials: Parameters<typeof login>[0]) => {
            setLogoutLock(false);
            await login(credentials);
            await clearSession(queryClient);
            const currentUser = await queryClient.fetchQuery({
                ...sessionQueryOptions(),
                staleTime: 0,
            });
            if (!currentUser)
                throw new Error(
                    'Unable to establish your session. Please try again.',
                );
        },
    });

    async function refreshSession() {
        await queryClient.invalidateQueries({
            queryKey: AUTH_QUERY_KEY,
            exact: true,
        });
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: user !== null,
                isLoading:
                    session.isPending ||
                    (session.isError && session.isFetching),
                error: session.error,
                isLoggingIn: loginMutation.isPending,
                isLoggingOut:
                    logoutLocks.get(queryClient) === true ||
                    logoutMutation.isPending,
                login: loginMutation.mutateAsync,
                logout: logoutMutation.mutateAsync,
                acknowledgeLogout: () => setLogoutLock(false),
                refreshSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
