<?php

declare(strict_types=1);

use App\Exceptions\FinanceQueryException;
use App\Services\FinanceQueryClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
});

describe('fxRate', function (): void {
    test('returns 1.0 when from and to are the same currency', function (): void {
        $client = app(FinanceQueryClient::class);

        expect($client->fxRate('EUR', 'EUR'))->toBe(1.0)
            ->and($client->fxRate('USD', 'USD'))->toBe(1.0);
    });

    test('returns the rate from the API and caches it', function (): void {
        Http::fake([
            '*finance-query.com/v2/forex/USD/EUR*' => Http::response([
                'price' => 0.92,
                'baseCurrency' => 'USD',
                'quoteCurrency' => 'EUR',
                'symbol' => 'USDEUR',
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        $rate = $client->fxRate('USD', 'EUR');

        expect($rate)->toBe(0.92);
        expect(Cache::get('fq:fx:USDEUR'))->toBe(0.92);
    });

    test('falls back to bid then ask when price is missing', function (): void {
        Http::fake([
            '*finance-query.com/v2/forex/USD/EUR*' => Http::response([
                'price' => null,
                'bid' => 0.861,
                'ask' => 0.862,
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect($client->fxRate('USD', 'EUR'))->toBe(0.861);
    });

    test('returns cached rate without hitting the API again', function (): void {
        Cache::put('fq:fx:USDEUR', 0.91, 300);

        Http::fake();

        $client = app(FinanceQueryClient::class);

        expect($client->fxRate('USD', 'EUR'))->toBe(0.91);

        Http::assertNothingSent();
    });

    test('throws FinanceQueryException when API returns null price', function (): void {
        Http::fake([
            '*finance-query.com/v2/forex/*' => Http::response([
                'price' => null,
                'bid' => null,
                'ask' => null,
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class, 'Unable to resolve FX rate USD -> EUR');
    });

    test('does not cache a null rate so subsequent calls retry the API', function (): void {
        Http::fake([
            '*finance-query.com/v2/forex/*' => Http::sequence()
                ->push(['price' => null])
                ->push(['price' => 0.93]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class);

        expect(Cache::get('fq:fx:USDEUR'))->toBeNull();

        expect($client->fxRate('USD', 'EUR'))->toBe(0.93);
    });

    test('throws FinanceQueryException when API returns zero price', function (): void {
        Http::fake([
            '*finance-query.com/v2/forex/*' => Http::response([
                'price' => 0,
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class, 'Unable to resolve FX rate USD -> EUR');
    });
});

describe('quotes', function (): void {
    test('indexes a list of quotes by symbol', function (): void {
        Http::fake([
            '*finance-query.com/v2/quotes*' => Http::response([
                'errors' => [],
                'quotes' => [
                    ['symbol' => 'AAPL', 'regularMarketPrice' => 200.0],
                    ['symbol' => 'msft', 'regularMarketPrice' => 400.0],
                ],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);
        $quotes = $client->quotes(['AAPL', 'MSFT']);

        expect($quotes['AAPL']['regularMarketPrice'])->toEqual(200)
            ->and($quotes['MSFT']['regularMarketPrice'])->toEqual(400);
    });

    test('indexes a Relay nodes connection by symbol', function (): void {
        Http::fake([
            '*finance-query.com/v2/quotes*' => Http::response([
                'errors' => [],
                'quotes' => [
                    'nodes' => [
                        ['symbol' => 'AAPL', 'regularMarketPrice' => 201.0],
                    ],
                    'pageInfo' => ['hasNextPage' => false],
                ],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect($client->quote('AAPL')['regularMarketPrice'])->toEqual(201);
    });
});

describe('spark', function (): void {
    test('indexes a list of sparks by symbol', function (): void {
        Http::fake([
            '*finance-query.com/v2/spark*' => Http::response([
                'errors' => [],
                'sparks' => [
                    [
                        'symbol' => 'AAPL',
                        'closes' => [100.0, 102.0],
                        'timestamps' => [1, 2],
                        'meta' => ['currency' => 'USD'],
                    ],
                ],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);
        $sparks = $client->spark(['AAPL']);

        expect($sparks['AAPL']['closes'])->toBe([100.0, 102.0])
            ->and($sparks['AAPL']['timestamps'])->toBe([1, 2])
            ->and($sparks['AAPL']['meta']['currency'])->toBe('USD');
    });
});

describe('screener', function (): void {
    test('maps legacy limit, sort, and fields onto the v3 body', function (): void {
        Http::fake([
            '*finance-query.com/v2/screeners/custom*' => Http::response([
                'quotes' => [],
                'total' => 0,
            ]),
        ]);

        $client = app(FinanceQueryClient::class);
        $client->screener([
            'quoteType' => 'EQUITY',
            'filters' => [
                ['field' => 'region', 'operator' => 'eq', 'value' => 'us'],
            ],
            'limit' => 20,
            'fields' => ['symbol', 'regularMarketPrice'],
            'sort' => ['field' => 'percentchange', 'direction' => 'desc'],
        ]);

        Http::assertSent(function ($request): bool {
            $body = $request->data();

            return $request->method() === 'POST'
                && str_contains($request->url(), '/v2/screeners/custom')
                && ($body['size'] ?? null) === 20
                && ! array_key_exists('limit', $body)
                && ($body['sortField'] ?? null) === 'percentchange'
                && ($body['sortType'] ?? null) === 'DESC'
                && ! array_key_exists('sort', $body)
                && ($body['fields'] ?? null) === 'symbol,regularMarketPrice';
        });
    });
});
