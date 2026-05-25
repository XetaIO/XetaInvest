<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\FinanceQueryException;
use App\Http\Controllers\Controller;
use App\Services\FinanceQueryClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request, FinanceQueryClient $client): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:64'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:25'],
        ]);

        try {
            $results = $client->search($validated['q'], (int) ($validated['limit'] ?? 10));
        } catch (FinanceQueryException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }

        return response()->json(['results' => $results]);
    }
}
