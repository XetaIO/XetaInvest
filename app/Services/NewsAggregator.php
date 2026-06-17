<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class NewsAggregator
{
    /**
     * Maximum number of news items to fetch per symbol when no specific symbol filter is applied.
     */
    public const PER_SYMBOL_LIMIT = 5;

    /**
     * Number of news items to display per page in the paginated results.
     */
    public const PER_PAGE = 20;

    /**
     * Base URL for stockanalysis.com, used to resolve relative news links to absolute URLs.
     */
    protected const STOCKANALYSIS_BASE_URL = 'https://stockanalysis.com';

    public function __construct(
        protected FinanceQueryClient $client,
    ) {
    }

    /**
     * Aggregate news articles for a given user, optionally filtered by a specific symbol.
     *
     * @param User $user The user for whom to aggregate news.
     * @param string|null $symbolFilter Optional symbol to filter news articles.
     * @param int $page The page number for pagination.
     * @param string|null $baseUrl Optional base URL for pagination links.
     *
     * @return array An array containing the paginated news articles and available symbols.
     */
    public function aggregateForUser(User $user, ?string $symbolFilter = null, int $page = 1, ?string $baseUrl = null): array
    {
        $userSymbols = $user->portfolios()
            ->with('positions.instrument')
            ->get()
            ->flatMap(fn ($p) => $p->positions->map(fn ($pos) => strtoupper((string) $pos->instrument->symbol)))
            ->unique()
            ->values()
            ->all();

        sort($userSymbols);

        $symbolFilter = $symbolFilter !== null ? strtoupper(trim($symbolFilter)) : null;

        if ($symbolFilter !== null && ! in_array($symbolFilter, $userSymbols, true)) {
            $symbolFilter = null;
        }

        $symbolsToFetch = $symbolFilter !== null ? [$symbolFilter] : $userSymbols;
        $applyPerSymbolLimit = $symbolFilter === null;

        $items = new Collection();

        foreach ($symbolsToFetch as $symbol) {
            try {
                $raw = $this->client->news($symbol);
            } catch (FinanceQueryException $e) {
                Log::warning('News fetch failed for symbol', ['symbol' => $symbol, 'error' => $e->getMessage()]);

                continue;
            }

            if ($applyPerSymbolLimit) {
                $raw = array_slice($raw, 0, self::PER_SYMBOL_LIMIT);
            }

            foreach ($raw as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $time = (string) ($row['time'] ?? '');

                $items->push([
                    'symbol' => $symbol,
                    'title' => (string) ($row['title'] ?? ''),
                    'link' => $this->normalizeLink((string) ($row['link'] ?? '')),
                    'source' => (string) ($row['source'] ?? ''),
                    'image' => isset($row['img']) && $row['img'] !== '' ? (string) $row['img'] : null,
                    'time' => $time,
                    'sort_minutes' => $this->parseRelativeTime($time),
                ]);
            }
        }

        $sorted = $items
            ->sortBy([
                ['sort_minutes', 'asc'],
                ['title', 'asc'],
            ])
            ->values();

        if ($baseUrl !== null) {
            Paginator::currentPathResolver(fn () => $baseUrl);
        }

        $paginator = new LengthAwarePaginator(
            $sorted->forPage($page, self::PER_PAGE)->values()->all(),
            $sorted->count(),
            self::PER_PAGE,
            $page,
            [
                'path' => $baseUrl ?? Paginator::resolveCurrentPath(),
                'pageName' => 'page',
            ],
        );

        if ($symbolFilter !== null) {
            $paginator->appends(['symbol' => $symbolFilter]);
        }

        return [
            'news' => $paginator,
            'available_symbols' => $userSymbols,
        ];
    }

    /**
     * Normalize a news link to ensure it is an absolute URL. If the link is relative, it will be prefixed with the stockanalysis.com base URL.
     *
     * @param string $link The news link to normalize.
     *
     * @return string The normalized absolute URL.
     */
    protected function normalizeLink(string $link): string
    {
        $link = trim($link);

        if ($link === '' || preg_match('#^https?://#i', $link) === 1) {
            return $link;
        }

        return self::STOCKANALYSIS_BASE_URL.'/'.ltrim($link, '/');
    }

    /**
     * Parse a relative time string (e.g., "2 hours ago") into the number of minutes since that time.
     *
     * @param string $time The relative time string to parse.
     *
     * @return int The number of minutes since the given time, or PHP_INT_MAX if the format is unrecognized.
     */
    protected function parseRelativeTime(string $time): int
    {
        $time = strtolower(trim($time));

        if ($time === '' || $time === 'just now') {
            return 0;
        }

        if ($time === 'yesterday') {
            return 1440;
        }

        if (! preg_match('/^(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago$/', $time, $m)) {
            return PHP_INT_MAX;
        }

        $n = (int) $m[1];

        return match ($m[2]) {
            'minute' => $n,
            'hour' => $n * 60,
            'day' => $n * 1440,
            'week' => $n * 10080,
            'month' => $n * 43200,
            'year' => $n * 525600,
        };
    }
}
