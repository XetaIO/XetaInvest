<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
    $this->user = User::factory()->create();
});

function fakeSymbolQuote(): void
{
    Http::fake([
        '*finance-query.com/v2/quote/AAPL*' => Http::response([
            'symbol' => 'AAPL',
            'name' => 'Apple Inc.',
            'exchange' => 'NMS',
            'currency' => 'USD',
            'price' => 189.84,
            'change' => 1.23,
            'changePercent' => 0.65,
            'previousClose' => 188.61,
            'open' => 188.50,
            'dayHigh' => 190.10,
            'dayLow' => 187.90,
            'fiftyTwoWeekHigh' => 200.00,
            'fiftyTwoWeekLow' => 150.00,
            'volume' => 50000000,
            'marketCap' => 3000000000000,
            'pe' => 32.5,
        ]),
        '*finance-query.com/v2/chart/AAPL*' => Http::response([
            ['date' => '2025-01-01', 'close' => 180.0, 'open' => 179.0, 'high' => 181.0, 'low' => 178.5, 'volume' => 1000000],
            ['date' => '2025-01-02', 'close' => 182.5, 'open' => 180.5, 'high' => 183.0, 'low' => 180.0, 'volume' => 1200000],
            ['date' => '2025-01-03', 'close' => 185.0, 'open' => 183.0, 'high' => 186.0, 'low' => 182.5, 'volume' => 1100000],
        ]),
        '*finance-query.com/v2/news/AAPL*' => Http::response([
            ['title' => 'Apple story 1', 'link' => 'https://news.example/1', 'source' => 'Example', 'time' => '1h ago', 'img' => 'https://img.example/1.png'],
            ['title' => 'Apple story 2', 'link' => '/relative/path', 'source' => 'Example', 'time' => '2h ago', 'img' => ''],
            ['title' => 'Apple story 3', 'link' => 'https://news.example/3', 'source' => 'Example', 'time' => '3h ago', 'img' => 'https://img.example/3.png'],
            ['title' => 'Apple story 4', 'link' => 'https://news.example/4', 'source' => 'Example', 'time' => '4h ago', 'img' => ''],
        ]),
        '*finance-query.com/v2/recommendations/AAPL*' => Http::response([
            'symbol' => 'AAPL',
            'recommendations' => [
                ['symbol' => 'MSFT', 'score' => 0.95],
                ['symbol' => 'GOOG', 'score' => 0.91],
            ],
        ]),
        '*finance-query.com/v2/quotes*' => Http::response([
            'quotes' => [
                'MSFT' => ['symbol' => 'MSFT', 'longName' => 'Microsoft Corp.'],
                'GOOG' => ['symbol' => 'GOOG', 'shortName' => 'Alphabet'],
            ],
        ]),
    ]);
}

test('guest is redirected from symbol page', function () {
    $this->get('/symbol/AAPL')->assertRedirect(route('login'));
});

test('authenticated user can view symbol page', function () {
    fakeSymbolQuote();

    $this->actingAs($this->user)->get('/symbol/AAPL')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('symbol')
                ->where('symbol', 'AAPL')
                ->where('quote.symbol', 'AAPL')
                ->where('quote.name', 'Apple Inc.')
                ->where('quote.price', 189.84)
                ->where('chart.range', '1mo')
                ->has('chart.points', 3)
                ->has('news', 3)
                ->where('news.1.link', 'https://stockanalysis.com/relative/path')
                ->has('recommendations', 2)
                ->where('recommendations.0.symbol', 'MSFT')
                ->where('recommendations.0.name', 'Microsoft Corp.')
                ->where('recommendations.1.name', 'Alphabet')
        );
});

test('symbol page renders when quote API fails', function () {
    Http::fake([
        '*finance-query.com/v2/quote/*' => Http::response('', 500),
        '*finance-query.com/v2/chart/*' => Http::response([]),
        '*finance-query.com/v2/news/*' => Http::response([]),
        '*finance-query.com/v2/recommendations/*' => Http::response(['recommendations' => []]),
        '*finance-query.com/v2/quotes*' => Http::response(['quotes' => []]),
    ]);

    $this->actingAs($this->user)->get('/symbol/AAPL')
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('symbol')
                ->where('quote', null)
        );
});

test('chart endpoint returns points for requested range', function () {
    fakeSymbolQuote();

    $response = $this->actingAs($this->user)->getJson('/symbol/AAPL/chart?range=1y');

    $response->assertOk()
        ->assertJsonPath('symbol', 'AAPL')
        ->assertJsonPath('range', '1y')
        ->assertJsonCount(3, 'points');
});

test('chart endpoint falls back to default range when invalid', function () {
    fakeSymbolQuote();

    $this->actingAs($this->user)->getJson('/symbol/AAPL/chart?range=invalid')
        ->assertOk()
        ->assertJsonPath('range', '1mo');
});
