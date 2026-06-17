<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class FinanceQueryClient
{
    protected string $baseUrl;

    protected float $timeout;

    protected int $quoteTtl;

    protected int $fxTtl;

    protected int $searchTtl;

    protected int $newsTtl;

    /**
     * FinanceQueryClient constructor.
     *
     * Initializes the client with configuration settings for the FinanceQuery service, including base URL, timeout, and cache TTLs for various endpoints.
     */
    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('services.finance_query.url'), '/');
        $this->timeout = (float) config('services.finance_query.timeout', 5);
        $this->quoteTtl = (int) config('services.finance_query.quote_ttl', 60);
        $this->fxTtl = (int) config('services.finance_query.fx_ttl', 300);
        $this->searchTtl = (int) config('services.finance_query.search_ttl', 60);
        $this->newsTtl = (int) config('services.finance_query.news_ttl', 900);
    }

    /**
     * Search symbols by name or ticker via /v2/lookup.
     *
     * @param string $query The search query.
     * @param int $limit The maximum number of results to return.
     * @param string $region The region for the search.
     *
     * @return array An array of search results, each containing symbol, name, exchange, type, and logo URL.
     */
    public function search(string $query, int $limit = 25, string $region = 'FR'): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $key = sprintf('fq:search:%s:%d:%s', strtolower($query), $limit, strtolower($region));

        return Cache::remember($key, $this->searchTtl, function () use ($query, $limit, $region): array {
            $payload = $this->get('/v2/lookup', [
                'q' => $query,
                'type' => 'all',
                'count' => $limit,
                'logo' => 'true',
                'region' => $region,
            ]);

            $items = $payload['quotes'] ?? [];

            return array_map(static function (array $item): array {
                return [
                    'symbol' => $item['symbol'] ?? '',
                    'name' => $item['shortName'] ?? $item['longName'] ?? $item['name'] ?? null,
                    'exchange' => $item['exchange'] ?? null,
                    'type' => $item['quoteType'] ?? $item['type'] ?? null,
                    'logo_url' => $item['logoUrl'] ?? $item['companyLogoUrl'] ?? null,
                ];
            }, is_array($items) ? $items : []);
        });
    }

    /**
     * Get a quote for a single symbol. Cached individually per symbol.
     *
     * @param string $symbol The symbol for which to retrieve the quote.
     * @param bool $force Whether to force a refresh of the cached quote.
     *
     * @return array<string, mixed>|null The quote data for the symbol, or null if not found.
     */
    public function quote(string $symbol, bool $force = false): ?array
    {
        $quotes = $this->quotes([$symbol], $force);

        return $quotes[strtoupper($symbol)] ?? null;
    }

    /**
     * Get quotes for multiple symbols at once. Cached individually per symbol.
     *
     * @param array<int, string> $symbols The list of symbols for which to retrieve quotes.
     * @param bool $force Whether to force a refresh of the cached quotes.
     *
     * @return array<string, array<string, mixed>> An associative array where keys are symbols and values are the corresponding quote data.
     */
    public function quotes(array $symbols, bool $force = false): array
    {
        $symbols = collect($symbols)
            ->map(fn (string $s): string => strtoupper(trim($s)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($symbols)) {
            return [];
        }

        $result = [];
        $toFetch = [];

        foreach ($symbols as $symbol) {
            $cached = $force ? null : Cache::get($this->quoteKey($symbol));

            if ($cached !== null) {
                $result[$symbol] = $cached;
            } else {
                $toFetch[] = $symbol;
            }
        }

        if (! empty($toFetch)) {
            $payload = $this->get('/v2/quotes', ['symbols' => implode(',', $toFetch)]);
            $fetched = $payload['quotes'] ?? [];

            foreach ($toFetch as $symbol) {
                if (isset($fetched[$symbol])) {
                    $result[$symbol] = $fetched[$symbol];
                    Cache::put($this->quoteKey($symbol), $fetched[$symbol], $this->quoteTtl);
                }
            }
        }

        return $result;
    }

    /**
     * Get chart data for a single symbol.
     *
     * @param string $symbol The symbol for which to retrieve chart data.
     * @param string $interval The interval for the chart data.
     * @param string $range The range for the chart data.
     *
     * @return array<string, mixed> The chart data for the symbol.
     */
    public function chart(string $symbol, string $interval = '1d', string $range = '1mo'): array
    {
        return $this->get('/v2/chart/'.strtoupper($symbol), ['interval' => $interval, 'range' => $range]);
    }

    /**
     * Get a detailed quote for a single symbol from /v2/quote/{symbol}.
     * Returns null if not found.
     *
     * @param string $symbol The symbol for which to retrieve detailed quote data.
     * @param bool $force Whether to force a refresh of the cached quote.
     *
     * @return array<string, mixed>|null The detailed quote data for the symbol, or null if not found.
     */
    public function quoteDetail(string $symbol, bool $force = false): ?array
    {
        $symbol = strtoupper(trim($symbol));

        if ($symbol === '') {
            return null;
        }

        $key = sprintf('fq:quote-detail:%s', $symbol);

        if ($force) {
            Cache::forget($key);
        }

        return Cache::remember($key, $this->quoteTtl, function () use ($symbol): ?array {
            $payload = $this->get('/v2/quote/'.$symbol);

            if (! is_array($payload) || $payload === []) {
                return null;
            }

            return $payload;
        });
    }

    /**
     * Get news articles for a single symbol from /v2/news/{symbol}.
     *
     * @param string $symbol The symbol for which to retrieve news articles.
     *
     * @return array<int, array<string, mixed>> An array of news articles, each containing title, link, published date, and other details.
     */
    public function news(string $symbol): array
    {
        $symbol = strtoupper($symbol);
        $key = sprintf('fq:news:%s', $symbol);

        return Cache::remember($key, $this->newsTtl, function () use ($symbol): array {
            $payload = $this->get('/v2/news/'.$symbol);

            $items = is_array($payload) && array_is_list($payload) ? $payload : ($payload['news'] ?? []);

            return is_array($items) ? $items : [];
        });
    }

    /**
     * Get similar-symbol recommendations from /v2/recommendations/{symbol}.
     *
     * @param string $symbol The symbol for which to retrieve recommendations.
     * @param int $limit The maximum number of recommendations to return.
     *
     * @return array<int, array{symbol: string, score: float|null}>
     */
    public function recommendations(string $symbol, int $limit = 5): array
    {
        $symbol = strtoupper(trim($symbol));

        if ($symbol === '') {
            return [];
        }

        $key = sprintf('fq:recommendations:%s:%d', $symbol, $limit);

        return Cache::remember($key, $this->newsTtl, function () use ($symbol, $limit): array {
            $payload = $this->get('/v2/recommendations/'.$symbol, ['limit' => $limit]);

            $items = is_array($payload) ? ($payload['recommendations'] ?? []) : [];

            return array_values(array_filter(array_map(static function ($item): ?array {
                if (! is_array($item) || empty($item['symbol'])) {
                    return null;
                }

                return [
                    'symbol' => strtoupper((string) $item['symbol']),
                    'score' => isset($item['score']) && is_numeric($item['score']) ? (float) $item['score'] : null,
                ];
            }, $items)));
        });
    }

    /**
     * Get sparkline data for multiple symbols at once via /v2/spark.
     *
     * @param  array<int, string>  $symbols
     * @param string $interval The interval for the sparkline data.
     * @param string $range The range for the sparkline data.
     * @param bool $force Whether to force a refresh of the cached sparkline data.
     *
     * @return array<string, array{closes: array<int, float>, timestamps: array<int, int>, meta: array<string, mixed>}>
     */
    public function spark(array $symbols, string $interval = '1d', string $range = '1mo', bool $force = false): array
    {
        $symbols = collect($symbols)
            ->map(fn (string $s): string => strtoupper(trim($s)))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        if (empty($symbols)) {
            return [];
        }

        $key = sprintf('fq:spark:%s:%s:%s', md5(implode(',', $symbols)), $interval, $range);

        if ($force) {
            Cache::forget($key);
        }

        return Cache::remember($key, $this->quoteTtl, function () use ($symbols, $interval, $range): array {
            $payload = $this->get('/v2/spark', [
                'symbols' => implode(',', $symbols),
                'interval' => $interval,
                'range' => $range,
            ]);

            $sparks = is_array($payload) ? ($payload['sparks'] ?? []) : [];

            $result = [];

            foreach ($sparks as $symbol => $data) {
                if (! is_array($data)) {
                    continue;
                }

                $closes = array_values(array_filter(
                    $data['closes'] ?? [],
                    static fn ($v): bool => is_numeric($v),
                ));

                if (empty($closes)) {
                    continue;
                }

                $result[strtoupper((string) $symbol)] = [
                    'closes' => array_map(static fn ($v): float => (float) $v, $closes),
                    'timestamps' => array_map(static fn ($v): int => (int) $v, $data['timestamps'] ?? []),
                    'meta' => is_array($data['meta'] ?? null) ? $data['meta'] : [],
                ];
            }

            return $result;
        });
    }

    /**
     * Get FX rate to convert 1 unit of $from into $to.
     *
     * @param string $from The currency from which to convert.
     * @param string $to The currency into which to convert.
     *
     * @return float The FX rate.
     */
    public function fxRate(string $from, string $to): float
    {
        $from = strtoupper($from);
        $to = strtoupper($to);

        if ($from === $to) {
            return 1.0;
        }

        $symbol = $from.$to.'=X';
        $key = sprintf('fq:fx:%s', $symbol);

        /** @var float|null $rate */
        $rate = Cache::get($key);

        if ($rate === null) {
            $payload = $this->get('/v2/quotes', ['symbols' => $symbol]);
            $price = $payload['quotes'][$symbol]['regularMarketPrice'] ?? null;

            if (is_numeric($price) && (float) $price > 0.0) {
                $rate = (float) $price;
                Cache::put($key, $rate, $this->fxTtl);
            }
        }

        if ($rate === null || $rate <= 0.0) {
            throw new FinanceQueryException(sprintf('Unable to resolve FX rate %s -> %s', $from, $to));
        }

        return $rate;
    }

    /**
     * Generate a cache key for storing quotes for a specific symbol.
     *
     * @param string $symbol The symbol for which to generate the cache key.
     *
     * @return string The generated cache key.
     */
    protected function quoteKey(string $symbol): string
    {
        return 'fq:quote:'.$symbol;
    }

    /**
     * Get screener results for a custom payload.
     *
     * @param array<string, mixed> $payload The payload for the screener request.
     * @param bool $force Whether to force a refresh of the cached screener results.
     *
     * @return array The screener results.
     */
    public function screener(array $payload, bool $force = false): array
    {
        $key = 'fq:screener:'.md5(json_encode($payload, JSON_THROW_ON_ERROR));

        if ($force) {
            Cache::forget($key);
        }

        return Cache::remember($key, $this->newsTtl, function () use ($payload): array {
            return $this->post('/v2/screeners/custom', $payload);
        });
    }

    /**
     * Perform a POST request to the FinanceQuery API.
     *
     * @param string $path The API endpoint path.
     * @param array $payload The payload for the POST request.
     *
     * @return array<string, mixed> The response data from the API.
     *
     * @throws FinanceQueryException If the request fails or the response is invalid.
     */
    protected function post(string $path, array $payload): array
    {
        try {
            $response = $this->client()->asJson()->post($this->baseUrl.$path, $payload);

            if ($response->failed()) {
                throw new FinanceQueryException(sprintf(
                    'FinanceQuery POST failed: %s (HTTP %d): %s',
                    $path,
                    $response->status(),
                    $response->body(),
                ));
            }

            $data = $response->json();

            return is_array($data) ? $data : [];
        } catch (ConnectionException|RequestException $e) {
            Log::warning('FinanceQuery POST error', ['path' => $path, 'error' => $e->getMessage()]);

            throw new FinanceQueryException('FinanceQuery unavailable: '.$e->getMessage(), 0, $e);
        } catch (Throwable $e) {
            if ($e instanceof FinanceQueryException) {
                throw $e;
            }

            throw new FinanceQueryException('FinanceQuery error: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Perform a GET request to the FinanceQuery API.
     *
     * @param string $path The API endpoint path.
     * @param array $query The query parameters for the GET request.
     *
     * @return array<string, mixed> The response data from the API.
     *
     * @throws FinanceQueryException If the request fails or the response is invalid.
     */
    protected function get(string $path, array $query = []): array
    {
        try {
            $response = $this->client()->get($this->baseUrl.$path, $query);

            if ($response->failed()) {
                throw new FinanceQueryException(sprintf(
                    'FinanceQuery request failed: %s %s (HTTP %d)',
                    $path,
                    json_encode($query),
                    $response->status(),
                ));
            }

            $data = $response->json();

            return is_array($data) ? $data : [];
        } catch (ConnectionException|RequestException $e) {
            Log::warning('FinanceQuery error', ['path' => $path, 'error' => $e->getMessage()]);

            throw new FinanceQueryException('FinanceQuery unavailable: '.$e->getMessage(), 0, $e);
        } catch (Throwable $e) {
            if ($e instanceof FinanceQueryException) {
                throw $e;
            }

            throw new FinanceQueryException('FinanceQuery error: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Create a new HTTP client for making requests to the FinanceQuery API.
     *
     * @return PendingRequest The configured HTTP client.
     */
    protected function client(): PendingRequest
    {
        return Http::acceptJson()
            ->timeout($this->timeout)
            ->retry(2, 200, throw: false);
    }
}
