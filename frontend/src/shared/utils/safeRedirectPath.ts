export function safeRedirectPath(
    candidate: unknown,
    fallback = '/dashboard',
): string {
    if (
        typeof candidate !== 'string' ||
        !candidate.startsWith('/') ||
        candidate.startsWith('//')
    )
        return fallback;
    // Backslashes and control characters can change how browsers resolve a URL.
    // eslint-disable-next-line no-control-regex -- intentional: rejecting control chars is the point.
    if (/[\\\u0000-\u0020\u007f]/.test(candidate)) return fallback;
    const url = new URL(candidate, 'https://app.invalid');
    if (
        url.origin !== 'https://app.invalid' ||
        /^\/login\/?$/i.test(url.pathname)
    )
        return fallback;
    return url.pathname + url.search + url.hash;
}
