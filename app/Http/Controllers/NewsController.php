<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AiReport;
use App\Services\NewsAggregator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewsController extends Controller
{
    /**
     * Display the news page with aggregated news articles based on the user's preferences and portfolio.
     *
     * @param Request $request The incoming HTTP request.
     * @param NewsAggregator $aggregator Service to aggregate news articles for the user.
     *
     * @return Response An Inertia response rendering the news page with aggregated articles.
     */
    public function show(Request $request, NewsAggregator $aggregator): Response
    {
        $user = $request->user();

        $symbolParam = $request->query('symbol');
        $symbol = is_string($symbolParam) && $symbolParam !== '' && $symbolParam !== 'all'
            ? $symbolParam
            : null;

        $page = max(1, (int) $request->query('page', '1'));

        $result = $aggregator->aggregateForUser($user, $symbol, $page, $request->url());

        $paginator = $result['news'];

        return Inertia::render('news', [
            'news' => [
                'data' => $paginator->items(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'links' => $paginator->linkCollection()->toArray(),
            ],
            'available_symbols' => $result['available_symbols'],
            'aiNewsReport' => AiReport::query()
                ->where('user_id', $user->id)
                ->where('type', 'news_screener')
                ->whereDate('generated_for_date', today())
                ->latest()
                ->first(),
            'scope' => [
                'symbol' => $symbol !== null && in_array(strtoupper($symbol), $result['available_symbols'], true)
                    ? strtoupper($symbol)
                    : null,
            ],
        ]);
    }
}
