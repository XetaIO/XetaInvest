<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('search proxies to finance-query with query param', function () {
    Http::fake([
        '*finance-query.com/v1/search*' => Http::response([
            ['symbol' => 'AAPL', 'name' => 'Apple Inc.', 'exchange' => 'NASDAQ', 'type' => 'equity'],
        ]),
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.search', ['q' => 'apple']))
        ->assertOk()
        ->assertJsonPath('results.0.symbol', 'AAPL')
        ->assertJsonPath('results.0.name', 'Apple Inc.');

    Http::assertSent(fn ($request) => str_contains($request->url(), 'query=apple'));
});

test('search requires q parameter', function () {
    $this->actingAs($this->user)
        ->getJson(route('api.search'))
        ->assertStatus(422);
});

test('quotes endpoint returns batched quotes', function () {
    Http::fake([
        '*finance-query.com/v2/quotes*' => Http::response([
            'errors' => [],
            'quotes' => [
                'AAPL' => ['symbol' => 'AAPL', 'regularMarketPrice' => 200.0],
                'MSFT' => ['symbol' => 'MSFT', 'regularMarketPrice' => 400.0],
            ],
        ]),
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.quotes', ['symbols' => 'AAPL,MSFT']))
        ->assertOk()
        ->assertJsonPath('quotes.AAPL.regularMarketPrice', 200)
        ->assertJsonPath('quotes.MSFT.regularMarketPrice', 400);
});

test('guest cannot reach api endpoints', function () {
    $this->getJson(route('api.search', ['q' => 'x']))->assertStatus(401);
    $this->getJson(route('api.quotes', ['symbols' => 'AAPL']))->assertStatus(401);
});
