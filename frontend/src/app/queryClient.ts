import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { clearSession } from '../features/Auth/api/session';
import { ApiClientError } from '../shared/api/client';

export function createAppQueryClient() {
    function handleError(error: Error) {
        if (error instanceof ApiClientError && error.status === 401) {
            void clearSession(queryClient);
        }
    }

    const queryClient = new QueryClient({
        queryCache: new QueryCache({ onError: handleError }),
        mutationCache: new MutationCache({
            onError: (error, _variables, _result, mutation) => {
                if (!mutation.meta?.skipAuthReset) handleError(error);
            },
        }),
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => {
                    if (error instanceof ApiClientError && error.status < 500)
                        return false;
                    return failureCount < 2;
                },
            },
        },
    });

    return queryClient;
}
