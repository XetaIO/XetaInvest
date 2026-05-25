<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WatchlistApiController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $watchlists = $request->user()->watchlists()
            ->get(['id', 'name'])
            ->map(fn ($w) => ['id' => $w->id, 'name' => $w->name])
            ->values();

        return response()->json(['data' => $watchlists]);
    }

    public function history(Request $request, FinanceQueryClient $client): JsonResponse
    {
        $raw = (string) $request->query('symbols', '');

        $symbols = collect(explode(',', $raw))
            ->map(fn (string $s): string => strtoupper(trim($s)))
            ->filter()
            ->unique()
            ->take(25)
            ->values()
            ->all();

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
