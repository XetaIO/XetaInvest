/**
 * Shared fetch utilities for CSRF-aware API requests (Sanctum / same-origin).
 * All non-GET requests automatically include the X-XSRF-TOKEN header.
 */

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Typed, CSRF-aware wrapper around the native `fetch` API.
 * Throws an enriched Error (with `.status`) on non-OK responses.
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(init?.headers as Record<string, string> | undefined),
    };

    if (method !== 'GET' && method !== 'HEAD') {
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        const token = getXsrfToken();

        if (token) {
            headers['X-XSRF-TOKEN'] = token;
        }
    }

    const response = await fetch(url, {
        credentials: 'same-origin',
        ...init,
        headers,
    });

    if (!response.ok) {
        let message = `HTTP ${response.status}`;

        if (response.status === 422 || response.status === 429) {
            try {
                const body = (await response.json()) as { message?: string };

                if (body.message) {
                    message = body.message;
                }
            } catch {
                // ignore json parse errors
            }
        }

        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;

        throw err;
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/** Returns true when an error is a native AbortError (request cancelled). */
export function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
}
