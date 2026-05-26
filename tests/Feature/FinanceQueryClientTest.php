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
            '*' => Http::response([
                'quotes' => ['USDEUR=X' => ['regularMarketPrice' => 0.92]],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        $rate = $client->fxRate('USD', 'EUR');

        expect($rate)->toBe(0.92);
        expect(Cache::get('fq:fx:USDEUR=X'))->toBe(0.92);
    });

    test('returns cached rate without hitting the API again', function (): void {
        Cache::put('fq:fx:USDEUR=X', 0.91, 300);

        Http::fake(); // No HTTP call should be made

        $client = app(FinanceQueryClient::class);

        expect($client->fxRate('USD', 'EUR'))->toBe(0.91);

        Http::assertNothingSent();
    });

    test('throws FinanceQueryException when API returns null price', function (): void {
        Http::fake([
            '*' => Http::response([
                'quotes' => ['USDEUR=X' => ['regularMarketPrice' => null]],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class, 'Unable to resolve FX rate USD -> EUR');
    });

    test('does not cache a null rate so subsequent calls retry the API', function (): void {
        Http::fake([
            // First call: API unavailable (null price)
            '*' => Http::sequence()
                ->push(['quotes' => ['USDEUR=X' => ['regularMarketPrice' => null]]])
                // Second call: API recovers
                ->push(['quotes' => ['USDEUR=X' => ['regularMarketPrice' => 0.93]]]),
        ]);

        $client = app(FinanceQueryClient::class);

        // First call fails
        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class);

        // Null must NOT have been cached
        expect(Cache::get('fq:fx:USDEUR=X'))->toBeNull();

        // Second call recovers
        expect($client->fxRate('USD', 'EUR'))->toBe(0.93);
    });

    test('throws FinanceQueryException when API returns zero price', function (): void {
        Http::fake([
            '*' => Http::response([
                'quotes' => ['USDEUR=X' => ['regularMarketPrice' => 0]],
            ]),
        ]);

        $client = app(FinanceQueryClient::class);

        expect(fn () => $client->fxRate('USD', 'EUR'))
            ->toThrow(FinanceQueryException::class, 'Unable to resolve FX rate USD -> EUR');
    });
});
