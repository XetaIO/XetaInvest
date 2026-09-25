import { useState } from 'react';
import { cn } from './twMerge';

/** Minimal shape for a ticker logo (search hits, dashboard instruments, …). */
export type SymbolLogoSource = {
    symbol: string;
    logo_url?: string | null;
};

/**
 * True when `url` is a fetchable http(s) logo.
 *
 * @param url Quote / search `logo_url`.
 */
export function isHttpLogoUrl(url: string | null | undefined): url is string {
    return Boolean(url && /^https?:\/\//i.test(url));
}

/**
 * Fallback initials when there is no logo.
 *
 * @param symbol Ticker (`AAPL`, `PE500.PA`).
 */
export function symbolInitials(symbol: string): string {
    return symbol.slice(0, 2).toUpperCase();
}

type SymbolLogoProps<T extends SymbolLogoSource> = {
    result: T;
    size?: number;
    className?: string;
};

/**
 * Remote logo, or a two-letter fallback from the ticker.
 *
 * @param result Any object with `symbol` and optional `logo_url`.
 * @param size Pixel size (default 28, same as GlobalSearch).
 */
export function SymbolLogo<T extends SymbolLogoSource>({
    result,
    size = 28,
    className,
}: SymbolLogoProps<T>) {
    const [failed, setFailed] = useState(false);
    const boxStyle = { width: size, height: size };

    if (isHttpLogoUrl(result.logo_url) && !failed) {
        return (
            <img
                src={result.logo_url}
                alt=""
                width={size}
                height={size}
                style={boxStyle}
                className={cn('shrink-0 rounded object-contain', className)}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            style={boxStyle}
            className={cn(
                'flex shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-neutral-800 dark:text-gray-300',
                className,
            )}
        >
            {symbolInitials(result.symbol)}
        </span>
    );
}
