import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { ApiClientError, get, post } from '../../../shared/api/client';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export interface CurrentUser {
    pid: string;
    name: string;
    email: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
}

function isLoggedOutStatus(status: number): boolean {
    return status === 401 || status === 404;
}

export async function fetchCurrentUser(
    signal?: AbortSignal,
): Promise<CurrentUser | null> {
    try {
        return await get<CurrentUser>('/api/auth/current', {
            signal,
        });
    } catch (err) {
        // 401: missing/invalid JWT. 404: stale cookie after the user row was deleted
        // (`db reset`) — Loco maps EntityNotFound to 404 unless the API remaps it.
        if (err instanceof ApiClientError && isLoggedOutStatus(err.status)) {
            return null;
        }
        throw err;
    }
}

export function sessionQueryOptions() {
    return queryOptions({
        queryKey: AUTH_QUERY_KEY,
        queryFn: ({ signal }) => fetchCurrentUser(signal),
        retry: false,
        staleTime: 60_000,
    });
}

export async function login(credentials: LoginCredentials) {
    await post('/api/auth/login', credentials);
}

export async function register(payload: RegisterPayload) {
    await post('/api/auth/register', payload);
}

export async function logout() {
    try {
        await post('/api/auth/logout');
    } catch (error) {
        // An expired session is already logged out.
        if (!(error instanceof ApiClientError && error.status === 401))
            throw error;
    }
}

export async function clearSession(queryClient: QueryClient) {
    await queryClient.cancelQueries();
    queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
    });
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
}
