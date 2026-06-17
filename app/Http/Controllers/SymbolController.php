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
    /**
     * Display the symbol page with detailed information, charts, and related data.
     *
     * @param Request $request The incoming HTTP request.
     * @param string $symbol The stock symbol to display information for.
     * @param FinanceQueryClient $client Service to fetch financial data for the symbol.
     * @param SymbolPageDataBuilder $builder Service to build the data required for the symbol page.
     *
     * @return Response An Inertia response rendering the symbol page with necessary data.
     */
    public function show(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        SymbolPageDataBuilder $builder,
    ): Response {
        return $builder->show($request, $symbol, $client);
    }

    /**
     * Provide chart data for the specified stock symbol.
     *
     * @param Request $request The incoming HTTP request.
     * @param string $symbol The stock symbol for which to provide chart data.
     * @param FinanceQueryClient $client Service to fetch financial data for the symbol.
     * @param SymbolPageDataBuilder $builder Service to build the chart data for the symbol.
     *
     * @return JsonResponse A JSON response containing the chart data for the specified symbol.
     */
    public function chart(
        Request $request,
        string $symbol,
        FinanceQueryClient $client,
        SymbolPageDataBuilder $builder,
    ): JsonResponse {
        return $builder->chart($request, $symbol, $client);
    }
}
