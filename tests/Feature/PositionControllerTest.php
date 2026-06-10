<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->portfolio = Portfolio::factory()->forUser($this->user)->default()->create();
});

test('user can add a new position with multiple buy lines', function () {
    Http::fake([
        '*finance-query.com/v2/quotes*' => Http::response([
            'errors' => [],
            'quotes' => [
                'AAPL' => [
                    'symbol' => 'AAPL', 'longName' => 'Apple Inc.', 'currency' => 'USD',
                    'exchange' => 'NMS', 'exchangeName' => 'NasdaqGS', 'quoteType' => 'EQUITY',
                    'regularMarketPrice' => 200.0, 'regularMarketPreviousClose' => 195.0,
                ],
            ],
        ]),
    ]);

    $payload = [
        'symbol' => 'AAPL',
        'lines' => [
            ['quantity' => 5, 'unit_price' => 100, 'executed_at' => '2026-01-15'],
            ['quantity' => 3, 'unit_price' => 110, 'executed_at' => '2026-02-15', 'notes' => 'DCA'],
        ],
    ];

    $this->actingAs($this->user)
        ->post(route('positions.store', $this->portfolio), $payload)
        ->assertRedirect();

    $position = $this->portfolio->positions()->first();
    expect($position)->not->toBeNull()
        ->and($position->instrument->symbol)->toBe('AAPL')
        ->and($position->instrument->currency)->toBe('USD')
        ->and($position->transactions)->toHaveCount(2);
});

test('user cannot add a position to another user portfolio', function () {
    $other = User::factory()->create();

    $this->actingAs($other)
        ->post(route('positions.store', $this->portfolio), [
            'symbol' => 'AAPL',
            'lines' => [['quantity' => 1, 'unit_price' => 1, 'executed_at' => '2026-01-01']],
        ])
        ->assertForbidden();
});

test('adding a position with unknown symbol returns validation error', function () {
    Http::fake([
        '*finance-query.com/v2/quotes*' => Http::response(['errors' => [], 'quotes' => []]),
    ]);

    $this->actingAs($this->user)
        ->post(route('positions.store', $this->portfolio), [
            'symbol' => 'NOPE',
            'lines' => [['quantity' => 1, 'unit_price' => 1, 'executed_at' => '2026-01-01']],
        ])
        ->assertSessionHasErrors('symbol');
});

test('position store validates lines are present', function () {
    $this->actingAs($this->user)
        ->post(route('positions.store', $this->portfolio), ['symbol' => 'AAPL', 'lines' => []])
        ->assertSessionHasErrors('lines');
});

test('user can delete a position', function () {
    $instrument = Instrument::factory()->create();
    $position = Position::factory()->forPortfolio($this->portfolio)->forInstrument($instrument)->create();

    $this->actingAs($this->user)
        ->delete(route('positions.destroy', $position))
        ->assertRedirect();

    expect(Position::find($position->id))->toBeNull();
});
