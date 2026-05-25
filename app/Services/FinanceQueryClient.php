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
     * Search symbols by name or ticker.
     *
     * @return array<int, array<string, mixed>>
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $key = sprintf('fq:search:%s:%d', strtolower($query), $limit);

        return Cache::remember($key, $this->searchTtl, function () use ($query, $limit): array {
            $payload = $this->get('/v1/search', ['query' => $query, 'hits' => $limit]);

            $items = is_array($payload) && array_is_list($payload) ? $payload : ($payload['quotes'] ?? []);

            return array_map(static function (array $item): array {
                return [
                    'symbol' => $item['symbol'] ?? '',
                    'name' => $item['name'] ?? $item['longname'] ?? $item['shortname'] ?? null,
                    'exchange' => $item['exchange'] ?? $item['exchDisp'] ?? null,
                    'type' => $item['type'] ?? $item['typeDisp'] ?? $item['quoteType'] ?? null,
                ];
            }, $items);
        });
    }

    /**
     * Get a single quote.
     *
     * @return array<string, mixed>|null
     */
    public function quote(string $symbol, bool $force = false): ?array
    {
        $quotes = $this->quotes([$symbol], $force);

        return $quotes[strtoupper($symbol)] ?? null;
    }

    /**
     * Get quotes for multiple symbols. Cached individually per symbol.
     *
     * @param  array<int, string>  $symbols
     * @return array<string, array<string, mixed>>
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
     * @return array<string, mixed>
     */
    public function chart(string $symbol, string $interval = '1d', string $range = '1mo'): array
    {
        return $this->get('/v2/chart/'.strtoupper($symbol), ['interval' => $interval, 'range' => $range]);
    }

    /**
     * Get a detailed quote for a single symbol from /v2/quote/{symbol}.
     * Returns null if not found.
     *
     * @return array<string, mixed>|null
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
     * @return array<int, array<string, mixed>>
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

        $rate = Cache::remember($key, $this->fxTtl, function () use ($symbol): ?float {
            $payload = $this->get('/v2/quotes', ['symbols' => $symbol]);
            $price = $payload['quotes'][$symbol]['regularMarketPrice'] ?? null;

            return is_numeric($price) ? (float) $price : null;
        });

        if ($rate === null || $rate <= 0.0) {
            throw new FinanceQueryException(sprintf('Unable to resolve FX rate %s -> %s', $from, $to));
        }

        return $rate;
    }

    protected function quoteKey(string $symbol): string
    {
        return 'fq:quote:'.$symbol;
    }

    /**
     * POST /v2/screeners/custom — run a custom screener.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
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
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
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
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
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

    protected function client(): PendingRequest
    {
        return Http::acceptJson()
            ->timeout($this->timeout)
            ->retry(2, 200, throw: false);
    }
}
