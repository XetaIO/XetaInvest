<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\FinanceQueryException;
use App\Http\Requests\Symbol\SearchSymbolsRequest;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class SymbolSearchController extends Controller
{
    /**
     * Handle the symbol search request and return matching symbols.
     *
     * @param SearchSymbolsRequest $request The validated request containing the search query.
     * @param FinanceQueryClient $client Service to perform the symbol search.
     *
     * @return JsonResponse A JSON response containing the search results.
     */
    public function __invoke(SearchSymbolsRequest $request, FinanceQueryClient $client): JsonResponse
    {
        $query = trim((string) $request->validated('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['data' => []]);
        }

        $locale = app()->getLocale();
        $region = match ($locale) {
            'fr' => 'FR',
            'en' => 'US',
            default => strtoupper($locale),
        };

        try {
            $results = $client->search($query, 25, $region);
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol search failed', ['query' => $query, 'error' => $e->getMessage()]);

            return response()->json(['data' => []]);
        }

        return response()->json(['data' => $results]);
    }
}
