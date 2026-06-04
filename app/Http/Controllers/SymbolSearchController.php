<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exceptions\FinanceQueryException;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SymbolSearchController extends Controller
{
    public function __invoke(Request $request, FinanceQueryClient $client): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

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
