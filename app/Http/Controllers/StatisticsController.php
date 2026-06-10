<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\PortfolioStatistics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatisticsController extends Controller
{
    public function show(Request $request, PortfolioStatistics $stats): Response
    {
        $user = $request->user();

        $portfolios = $user->portfolios()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get(['id', 'name', 'is_default']);

        $param = (string) $request->query('portfolio', 'all');
        $scope = 'all';
        $portfolio = null;

        if ($param !== 'all' && ctype_digit($param)) {
            $portfolio = $user->portfolios()->whereKey((int) $param)->first();
            if (! $portfolio) {
                abort(404);
            }
            $scope = (string) $portfolio->id;
        }

        $payload = $stats->compute($user, $portfolio, $request->boolean('refresh'));

        return Inertia::render('statistics', [
            'portfolios' => $portfolios,
            'scope' => $scope,
            'stats' => $payload,
        ]);
    }
}
