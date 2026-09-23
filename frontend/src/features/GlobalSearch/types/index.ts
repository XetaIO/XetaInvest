/** Contract for GET /api/symbol-search — generated from the Rust DTO. */
export type { SymbolSearchResult } from '../../../bindings/SymbolSearchResult';
export type { SymbolSearchResponse } from '../../../bindings/SymbolSearchResponse';

export interface SearchParams {
    q: string;
    region?: 'FR' | 'US';
    limit?: number;
}

export const SYMBOL_TYPES = [
    'equity',
    'etf',
    'mutualfund',
    'cryptocurrency',
    'index',
    'future',
    'currency',
] as const;

export type SymbolType = (typeof SYMBOL_TYPES)[number];
export type SearchTab = 'all' | SymbolType;
export const MIN_SEARCH_LENGTH = 2;
export const MAX_SEARCH_LENGTH = 100;
