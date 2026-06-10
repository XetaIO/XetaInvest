<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\PortfolioSnapshot;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
    $this->user = User::factory()->create();

    $this->portfolioA = Portfolio::factory()->for($this->user)->create([
        'name' => 'Portefeuille A',
        'is_default' => true,
    ]);
    $this->portfolioEmpty = Portfolio::factory()->for($this->user)->create([
        'name' => 'Empty',
        'is_default' => false,
    ]);

    $this->apple = Instrument::factory()->create([
        'symbol' => 'AAPL',
        'name' => 'Apple Inc.',
        'currency' => 'USD',
        'type' => 'EQUITY',
    ]);

    $pos = Position::factory()->forPortfolio($this->portfolioA)->forInstrument($this->apple)->create();
    Transaction::factory()->forPosition($pos)->buy()->create([
        'quantity' => 10,
        'unit_price' => 100,
        'executed_at' => now()->subYear()->toDateString(),
    ]);
});

function fakeFinanceQueryOk(): void
{
    Http::fake([
        '*finance-query.com/v2/quotes*' => function ($request) {
            $url = $request->url();
            parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $params);
            $requested = explode(',', $params['symbols'] ?? '');

            $available = [
                'AAPL' => ['symbol' => 'AAPL', 'regularMarketPrice' => 150.0, 'regularMarketPreviousClose' => 148.0, 'currency' => 'USD'],
                'USDEUR=X' => ['symbol' => 'USDEUR=X', 'regularMarketPrice' => 0.9],
            ];

            $quotes = [];
            foreach ($requested as $sym) {
                if (isset($available[$sym])) {
                    $quotes[$sym] = $available[$sym];
                }
            }

            return Http::response(['errors' => [], 'quotes' => $quotes]);
        },
    ]);
}

test('it captures snapshots for portfolios with positions and skips empty ones', function () {
    fakeFinanceQueryOk();

    $this->artisan('portfolio:snapshot', ['--date' => '2026-05-22'])
        ->assertSuccessful();

    expect(PortfolioSnapshot::count())->toBe(1);

    $snap = PortfolioSnapshot::first();
    expect($snap->portfolio_id)->toBe($this->portfolioA->id)
        ->and($snap->captured_on->toDateString())->toBe('2026-05-22')
        ->and($snap->position_count)->toBe(1)
        ->and($snap->quote_error)->toBeFalse()
        ->and((float) $snap->current_value_eur)->toBeGreaterThan(0.0);
});

test('it is idempotent when run twice on the same date', function () {
    fakeFinanceQueryOk();

    $this->artisan('portfolio:snapshot', ['--date' => '2026-05-22'])->assertSuccessful();
    $this->artisan('portfolio:snapshot', ['--date' => '2026-05-22'])->assertSuccessful();

    expect(PortfolioSnapshot::count())->toBe(1);
});

test('it does not persist a snapshot when finance-query fails', function () {
    Http::fake([
        '*finance-query.com/*' => Http::response('boom', 500),
    ]);

    $this->artisan('portfolio:snapshot', ['--date' => '2026-05-22'])->assertFailed();

    expect(PortfolioSnapshot::count())->toBe(0);
});

test('it can target a single portfolio with --portfolio option', function () {
    fakeFinanceQueryOk();

    $otherUser = User::factory()->create();
    $otherPortfolio = Portfolio::factory()->for($otherUser)->create();
    $pos = Position::factory()->forPortfolio($otherPortfolio)->forInstrument($this->apple)->create();
    Transaction::factory()->forPosition($pos)->buy()->create([
        'quantity' => 5,
        'unit_price' => 50,
        'executed_at' => now()->subYear()->toDateString(),
    ]);

    $this->artisan('portfolio:snapshot', [
        '--date' => '2026-05-22',
        '--portfolio' => $this->portfolioA->id,
    ])->assertSuccessful();

    expect(PortfolioSnapshot::count())->toBe(1)
        ->and(PortfolioSnapshot::first()->portfolio_id)->toBe($this->portfolioA->id);
});

test('it fails when --portfolio id does not exist', function () {
    $this->artisan('portfolio:snapshot', ['--portfolio' => 99999])->assertFailed();
});

test('it skips when --portfolio targets a portfolio with no positions', function () {
    fakeFinanceQueryOk();

    $this->artisan('portfolio:snapshot', [
        '--date' => '2026-05-22',
        '--portfolio' => $this->portfolioEmpty->id,
    ])->assertSuccessful();

    expect(PortfolioSnapshot::count())->toBe(0);
});
