<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PortfolioCalculator;

it('computes WAC and current value for a buy-only position', function () {
    $portfolio = Portfolio::factory()->forUser(User::factory()->create())->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL', 'currency' => 'USD']);
    $position = Position::factory()->forPortfolio($portfolio)->forInstrument($instrument)->create();

    Transaction::factory()->forPosition($position)->buy()->create([
        'quantity' => 10, 'unit_price' => 100, 'executed_at' => '2026-01-15',
    ]);
    Transaction::factory()->forPosition($position)->buy()->create([
        'quantity' => 10, 'unit_price' => 120, 'executed_at' => '2026-02-15',
    ]);

    $quote = ['regularMarketPrice' => 130.0, 'regularMarketPreviousClose' => 125.0, 'currency' => 'USD'];

    $result = (new PortfolioCalculator())->computePosition($position->refresh()->load('transactions', 'instrument'), $quote, 1.0);

    expect($result['quantity'])->toBe(20.0)
        ->and($result['avg_cost_native'])->toBe(110.0)
        ->and($result['invested_native'])->toBe(2200.0)
        ->and($result['current_value_native'])->toBe(2600.0)
        ->and($result['pnl_native'])->toBe(400.0)
        ->and(round($result['daily_change_eur'], 4))->toBe(100.0);
});

it('applies FIFO when selling part of a position', function () {
    $portfolio = Portfolio::factory()->forUser(User::factory()->create())->create();
    $instrument = Instrument::factory()->create(['currency' => 'USD']);
    $position = Position::factory()->forPortfolio($portfolio)->forInstrument($instrument)->create();

    Transaction::factory()->forPosition($position)->buy()->create([
        'quantity' => 10, 'unit_price' => 100, 'executed_at' => '2026-01-15',
    ]);
    Transaction::factory()->forPosition($position)->buy()->create([
        'quantity' => 10, 'unit_price' => 150, 'executed_at' => '2026-02-15',
    ]);
    Transaction::factory()->forPosition($position)->sell()->create([
        'quantity' => 12, 'unit_price' => 200, 'executed_at' => '2026-03-15',
    ]);

    $quote = ['regularMarketPrice' => 180.0, 'regularMarketPreviousClose' => 180.0, 'currency' => 'USD'];

    $result = (new PortfolioCalculator())->computePosition($position->refresh()->load('transactions', 'instrument'), $quote, 1.0);

    // After FIFO: line1 fully consumed (10 @ 100), line2 has 8 left (2 sold @ 150)
    // Realized: (200-100)*10 + (200-150)*2 = 1000 + 100 = 1100
    expect($result['quantity'])->toBe(8.0)
        ->and($result['realized_pnl_native'])->toBe(1100.0)
        ->and($result['invested_native'])->toBe(8.0 * 150)
        ->and($result['lines'])->toHaveCount(2)
        ->and($result['lines'][0]['remaining_quantity'])->toBe(0.0)
        ->and($result['lines'][1]['remaining_quantity'])->toBe(8.0);
});

it('converts native values to EUR via fxRate', function () {
    $portfolio = Portfolio::factory()->forUser(User::factory()->create())->create();
    $instrument = Instrument::factory()->create(['currency' => 'USD']);
    $position = Position::factory()->forPortfolio($portfolio)->forInstrument($instrument)->create();

    Transaction::factory()->forPosition($position)->buy()->create([
        'quantity' => 1, 'unit_price' => 100, 'executed_at' => '2026-01-01',
    ]);

    $quote = ['regularMarketPrice' => 110.0, 'regularMarketPreviousClose' => 100.0, 'currency' => 'USD'];
    $result = (new PortfolioCalculator())->computePosition($position->refresh()->load('transactions', 'instrument'), $quote, 0.9);

    expect($result['invested_eur'])->toBe(90.0)
        ->and($result['current_value_eur'])->toBe(99.0)
        ->and(round($result['pnl_eur'], 2))->toBe(9.0);
});
