import type { ErrorDetailDto } from '../../bindings/ErrorDetailDto';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
    signal?: AbortSignal;
};

export class ApiClientError extends Error {
    readonly status: number;
    readonly body: ErrorDetailDto | null;

    constructor(status: number, body: ErrorDetailDto | null) {
        super(
            messageFromDetail(body) ?? `Request failed with status ${status}`,
        );
        this.name = 'ApiClientError';
        this.status = status;
        this.body = body;
    }
}

function firstValidationMessage(
    body: ErrorDetailDto,
    field?: string,
): string | undefined {
    const errors = body.errors;
    if (!errors) {
        return undefined;
    }
    if (field) {
        const first = errors[field]?.[0];
        const fromField = first?.message ?? first?.code;
        if (fromField) {
            return fromField;
        }
    }
    for (const list of Object.values(errors)) {
        const first = list[0];
        const msg = first?.message ?? first?.code;
        if (msg) {
            return msg;
        }
    }
    return undefined;
}

function messageFromDetail(
    body: ErrorDetailDto | null,
    field?: string,
): string | undefined {
    if (!body) {
        return undefined;
    }
    return (
        firstValidationMessage(body, field) ??
        body.description ??
        body.error ??
        undefined
    );
}

/**
 * Human-readable Loco error for toasts and forms.
 *
 * Prefers `errors[field][0].message`, then the first field error, then
 * `description` / `error`.
 *
 * @param error Thrown value from `fetch` helpers.
 * @param field Optional JSON field to highlight.
 * @return Display string.
 */
export function locoErrorMessage(error: unknown, field?: string): string {
    if (error instanceof ApiClientError) {
        return messageFromDetail(error.body, field) ?? error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Request failed.';
}

function isJsonContentType(res: Response): boolean {
    const type = res.headers.get('content-type') ?? '';
    return type.includes('application/json');
}

async function parseJsonBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch {
        throw new ApiClientError(res.status, {
            error: 'invalid_json',
            description: 'The server returned a non-JSON response.',
            errors: null,
        });
    }
}

function isErrorDetail(data: unknown): data is ErrorDetailDto {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    return 'error' in data || 'description' in data || 'errors' in data;
}

async function parseErrorBody(res: Response): Promise<ErrorDetailDto | null> {
    try {
        const data = await parseJsonBody(res);
        if (isErrorDetail(data)) {
            return data;
        }
        return null;
    } catch (error) {
        if (error instanceof ApiClientError) {
            return error.body;
        }
        return null;
    }
}

export async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
    };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(path, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: options?.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.ok) {
        if (res.status === 204) {
            return undefined as T;
        }
        if (!isJsonContentType(res)) {
            throw new ApiClientError(res.status, {
                error: 'invalid_json',
                description: 'The server returned a non-JSON response.',
                errors: null,
            });
        }
        return (await parseJsonBody(res)) as T;
    }

    const errorBody = await parseErrorBody(res);

    throw new ApiClientError(res.status, errorBody);
}

export function get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
}

export function post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
): Promise<T> {
    return request<T>('POST', path, body, options);
}

export function put<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
): Promise<T> {
    return request<T>('PUT', path, body, options);
}

export function patch<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
): Promise<T> {
    return request<T>('PATCH', path, body, options);
}

export function del(path: string, options?: RequestOptions): Promise<void> {
    return request<void>('DELETE', path, undefined, options);
}
