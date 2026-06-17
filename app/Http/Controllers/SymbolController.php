<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\FinanceQueryException;
use App\Services\BuildSymbolPageData;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SymbolController extends Controller
{
    public function show(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        BuildSymbolPageData $builder,
    ): Response {
        return Inertia::render('symbol', $builder->build($symbol, $client));
    }

    public function chart(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        BuildSymbolPageData $builder,
    ): JsonResponse {
        $range = (string) $request->query('range', BuildSymbolPageData::DEFAULT_RANGE);

        try {
            return response()->json($builder->buildChart($symbol, $range, $client));
        } catch (FinanceQueryException $e) {
            Log::warning('Symbol chart fetch failed', [
                'symbol' => $symbol,
                'range' => $range,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Chart unavailable.',
            ], 503);
        }
    }
}
