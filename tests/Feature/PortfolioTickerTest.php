<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\User;
use App\Services\PortfolioTickerService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
});

function fakeSparkResponse(array $symbols, array $overrides = []): array
{
    $sparks = [];

    foreach ($symbols as $symbol) {
        $sparks[$symbol] = $overrides[$symbol] ?? [
            'symbol' => $symbol,
            'closes' => [100.0, 101.0, 102.0, 101.5, 103.0],
            'timestamps' => [1, 2, 3, 4, 5],
            'meta' => ['currency' => 'USD', 'symbol' => $symbol],
        ];
    }

    return ['sparks' => $sparks];
}

test('returns null for users with no portfolios when spark returns nothing', function () {
    $user = User::factory()->create();

    Http::fake([
        '*finance-query.com/v2/spark*' => Http::response(['sparks' => []]),
    ]);

    $ticker = app(PortfolioTickerService::class)->buildFor($user);

    expect($ticker)->toBeNull();
});

test('pads with indices when user has fewer than 15 symbols', function () {
    $user = User::factory()->create();
    $portfolio = Portfolio::factory()->forUser($user)->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL', 'name' => 'Apple Inc.', 'currency' => 'USD']);
    Position::factory()->forPortfolio($portfolio)->forInstrument($instrument)->create();

    $expectedSymbols = ['AAPL', '^FCHI', '^GSPC', '^STOXX50E', 'EURUSD=X', '^IXIC'];

    Http::fake([
        '*finance-query.com/v2/spark*' => Http::response(fakeSparkResponse($expectedSymbols)),
    ]);

    $ticker = app(PortfolioTickerService::class)->buildFor($user);

    expect($ticker)->toBeArray()
        ->and(collect($ticker)->pluck('symbol')->all())->toEqual($expectedSymbols)
        ->and($ticker[0]['name'])->toBe('Apple Inc.')
        ->and($ticker[1]['name'])->toBe('CAC 40')
        ->and($ticker[0]['price'])->toBe(103.0)
        ->and($ticker[0]['change'])->toBe(1.5)
        ->and(round($ticker[0]['change_percent'], 2))->toBe(round((1.5 / 101.5) * 100, 2));
});

test('aggregates symbols across all portfolios deduplicated', function () {
    $user = User::factory()->create();
    $p1 = Portfolio::factory()->forUser($user)->default()->create();
    $p2 = Portfolio::factory()->forUser($user)->create();

    $aapl = Instrument::factory()->create(['symbol' => 'AAPL', 'name' => 'Apple Inc.']);
    $msft = Instrument::factory()->create(['symbol' => 'MSFT', 'name' => 'Microsoft']);

    Position::factory()->forPortfolio($p1)->forInstrument($aapl)->create();
    Position::factory()->forPortfolio($p2)->forInstrument($aapl)->create();
    Position::factory()->forPortfolio($p2)->forInstrument($msft)->create();

    Http::fake([
        '*finance-query.com/v2/spark*' => Http::response(fakeSparkResponse(
            ['AAPL', 'MSFT', '^FCHI', '^GSPC', '^STOXX50E', 'EURUSD=X', '^IXIC']
        )),
    ]);

    $ticker = app(PortfolioTickerService::class)->buildFor($user);

    $symbols = collect($ticker)->pluck('symbol')->all();

    expect($symbols)->toContain('AAPL', 'MSFT', '^FCHI', '^IXIC')
        ->and(array_count_values($symbols)['AAPL'])->toBe(1);
});

test('returns null on spark api failure', function () {
    $user = User::factory()->create();

    Http::fake([
        '*finance-query.com/v2/spark*' => Http::response('', 500),
    ]);

    $ticker = app(PortfolioTickerService::class)->buildFor($user);

    expect($ticker)->toBeNull();
});
