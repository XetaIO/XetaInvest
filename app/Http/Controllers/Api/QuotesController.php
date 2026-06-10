<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\QuotesRequest;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class QuotesController extends Controller
{
    public function __invoke(QuotesRequest $request, FinanceQueryClient $client): JsonResponse
    {
        $validated = $request->validated();

        $symbols = collect(explode(',', $validated['symbols']))
            ->map(fn ($s) => strtoupper(trim($s)))
            ->filter()
            ->unique()
            ->take(50)
            ->values()
            ->all();

        try {
            $quotes = $client->quotes($symbols, (bool) ($validated['refresh'] ?? false));
        } catch (FinanceQueryException $e) {
            $errorId = (string) Str::uuid();
            Log::warning('Quote provider failed', [
                'error_id' => $errorId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => __('messages.market_data.unavailable'),
                'error_id' => $errorId,
            ], 503);
        }

        return response()->json([
            'quotes' => $quotes,
            'fetched_at' => now()->toIso8601String(),
        ]);
    }
}
