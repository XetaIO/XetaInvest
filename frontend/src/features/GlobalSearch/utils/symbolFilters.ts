import { SYMBOL_TYPES } from '../types';
import type { SymbolSearchResult, SymbolType } from '../types';

export function getAvailableSymbolTypes(
    results: readonly SymbolSearchResult[],
): SymbolType[] {
    return SYMBOL_TYPES.filter((type) =>
        results.some((result) => result.type?.toLowerCase() === type),
    );
}
