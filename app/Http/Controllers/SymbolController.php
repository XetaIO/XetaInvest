<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\FinanceQueryClient;
use App\Services\SymbolPageDataBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class SymbolController extends Controller
{
    public function show(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        SymbolPageDataBuilder $builder,
    ): Response {
        return $builder->show($request, $symbol, $client);
    }

    public function chart(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        SymbolPageDataBuilder $builder,
    ): JsonResponse {
        return $builder->chart($request, $symbol, $client);
    }
}
