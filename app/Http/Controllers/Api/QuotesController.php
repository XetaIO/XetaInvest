<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotesController extends Controller
{
    public function __invoke(Request $request, FinanceQueryClient $client): JsonResponse
    {
        $validated = $request->validate([
            'symbols' => ['required', 'string'],
            'refresh' => ['sometimes', 'boolean'],
        ]);

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
            return response()->json(['message' => $e->getMessage()], 503);
        }

        return response()->json([
            'quotes' => $quotes,
            'fetched_at' => now()->toIso8601String(),
        ]);
    }
}
