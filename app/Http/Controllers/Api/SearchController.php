<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\SearchRequest;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SearchController extends Controller
{
    /**
     * Handle the incoming request to search for symbols based on a query string.
     *
     * @param SearchRequest $request The validated request containing the search query and optional limit.
     * @param FinanceQueryClient $client The client responsible for performing the search against the finance API.
     *
     * @return JsonResponse A JSON response containing the search results or an error message if the provider fails.
     */
    public function __invoke(SearchRequest $request, FinanceQueryClient $client): JsonResponse
    {
        $validated = $request->validated();

        try {
            $results = $client->search($validated['q'], (int) ($validated['limit'] ?? 10));
        } catch (FinanceQueryException $e) {
            $errorId = (string) Str::uuid();
            Log::warning('Symbol search provider failed', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => __('messages.market_data.unavailable'),
                'error_id' => $errorId,
            ], 503);
        }

        return response()->json(['results' => $results]);
    }
}
