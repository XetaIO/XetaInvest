<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\WatchlistHistoryRequest;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WatchlistApiController extends Controller
{
    /**
     * Retrieve a summary of the authenticated user's watchlists, including their IDs, names, and default section IDs.
     *
     * @param Request $request The incoming HTTP request.
     *
     * @return JsonResponse A JSON response containing the summary of the user's watchlists.
     */
    public function summary(Request $request): JsonResponse
    {
        $watchlists = $request->user()->watchlists()
            ->with('sections')
            ->get(['id', 'name'])
            ->map(fn ($watchlist) => [
                'id' => $watchlist->id,
                'name' => $watchlist->name,
                'default_section_id' => $watchlist->sections->firstWhere('is_default', true)?->id,
            ])
            ->values();

        return response()->json(['data' => $watchlists]);
    }

    /**
     * Retrieve the historical price data for a list of symbols within the user's watchlists.
     *
     * @param WatchlistHistoryRequest $request The validated request containing the symbols.
     * @param FinanceQueryClient $client The client responsible for fetching historical price data.
     *
     * @return JsonResponse A JSON response containing the historical price data for the specified symbols.
     */
    public function history(WatchlistHistoryRequest $request, FinanceQueryClient $client): JsonResponse
    {
        $raw = (string) $request->validated('symbols');

        $symbols = collect(explode(',', $raw))
            ->map(fn (string $s): string => strtoupper(trim($s)))
            ->filter()
            ->unique()
            ->take(25)
            ->values()
            ->all();

        $allowedSymbols = $request->user()->watchlists()
            ->reorder()
            ->join('watchlist_items', 'watchlists.id', '=', 'watchlist_items.watchlist_id')
            ->join('instruments', 'watchlist_items.instrument_id', '=', 'instruments.id')
            ->whereIn('instruments.symbol', $symbols)
            ->pluck('instruments.symbol')
            ->map(static fn (string $symbol): string => strtoupper($symbol))
            ->unique()
            ->all();

        $symbols = array_values(array_intersect($symbols, $allowedSymbols));

        if ($symbols === []) {
            return response()->json(['data' => []]);
        }

        try {
            $sparks = $client->spark($symbols, '5m', '1d');
        } catch (FinanceQueryException) {
            $sparks = [];
        }

        $data = [];

        foreach ($sparks as $symbol => $payload) {
            $closes = $payload['closes'] ?? [];
            $timestamps = $payload['timestamps'] ?? [];
            $points = [];

            foreach ($closes as $i => $close) {
                if (! isset($timestamps[$i])) {
                    continue;
                }
                $points[] = ['t' => $timestamps[$i] * 1000, 'v' => (float) $close];
            }

            $data[$symbol] = $points;
        }

        return response()->json(['data' => $data]);
    }
}
