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
    $this->portfolioB = Portfolio::factory()->for($this->user)->create([
        'name' => 'Portefeuille B',
        'is_default' => false,
    ]);

    $this->apple = Instrument::factory()->create([
        'symbol' => 'AAPL',
        'name' => 'Apple Inc.',
        'currency' => 'USD',
        'type' => 'EQUITY',
    ]);
    $this->psp = Instrument::factory()->create([
        'symbol' => 'PSP5.PA',
        'name' => 'Amundi PEA S&P 500 ESG',
        'currency' => 'EUR',
        'type' => 'ETF',
    ]);

    $posA = Position::factory()->forPortfolio($this->portfolioA)->forInstrument($this->apple)->create();
    Transaction::factory()->forPosition($posA)->buy()->create([
        'quantity' => 10,
        'unit_price' => 100,
        'executed_at' => now()->subYear()->toDateString(),
    ]);

    $posB = Position::factory()->forPortfolio($this->portfolioB)->forInstrument($this->psp)->create();
    Transaction::factory()->forPosition($posB)->buy()->create([
        'quantity' => 5,
        'unit_price' => 30,
        'executed_at' => now()->subMonths(6)->toDateString(),
    ]);
});

function fakeFinanceQuery(): void
{
    Http::fake([
        '*finance-query.com/v2/quotes*' => function ($request) {
            $url = $request->url();
            parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $params);
            $requested = explode(',', $params['symbols'] ?? '');

            $available = [
                'AAPL' => ['symbol' => 'AAPL', 'regularMarketPrice' => 150.0, 'regularMarketPreviousClose' => 148.0, 'currency' => 'USD'],
                'PSP5.PA' => ['symbol' => 'PSP5.PA', 'regularMarketPrice' => 35.0, 'regularMarketPreviousClose' => 34.5, 'currency' => 'EUR'],
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

test('guest is redirected from statistics page', function () {
    $this->get(route('statistics'))->assertRedirect(route('login'));
});

test('authenticated user sees aggregated stats across all portfolios', function () {
    fakeFinanceQuery();

    $response = $this->actingAs($this->user)->get(route('statistics'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('statistics')
            ->where('scope', 'all')
            ->where('stats.scope.type', 'all')
            ->where('stats.totals.position_count', 2)
            ->where('stats.totals.portfolio_count', 2)
            ->has('stats.allocations.by_instrument', 2)
            ->has('stats.allocations.by_portfolio', 2)
        );
});

test('user can filter stats by a specific portfolio', function () {
    fakeFinanceQuery();

    $this->actingAs($this->user)
        ->get(route('statistics', ['portfolio' => $this->portfolioA->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('scope', (string) $this->portfolioA->id)
            ->where('stats.scope.type', 'portfolio')
            ->where('stats.scope.id', $this->portfolioA->id)
            ->where('stats.totals.position_count', 1)
            ->has('stats.allocations.by_instrument', 1)
            ->where('stats.allocations.by_instrument.0.symbol', 'AAPL')
            ->where('stats.allocations.by_portfolio', [])
        );
});

test('user cannot view another user portfolio statistics', function () {
    fakeFinanceQuery();
    $other = User::factory()->create();
    $otherPortfolio = Portfolio::factory()->for($other)->create();

    $this->actingAs($this->user)
        ->get(route('statistics', ['portfolio' => $otherPortfolio->id]))
        ->assertNotFound();
});

test('refresh=1 query param bypasses the stats cache', function () {
    fakeFinanceQuery();

    $this->actingAs($this->user)->get(route('statistics'))->assertOk();
    $firstCount = count(Http::recorded());

    $this->actingAs($this->user)->get(route('statistics'))->assertOk();
    expect(count(Http::recorded()))->toBe($firstCount);

    $this->actingAs($this->user)->get(route('statistics', ['refresh' => 1]))->assertOk();
    expect(count(Http::recorded()))->toBeGreaterThan($firstCount);
});

test('quote_error is exposed when finance-query fails', function () {
    Http::fake([
        '*finance-query.com/*' => Http::response('boom', 500),
    ]);

    $this->actingAs($this->user)->get(route('statistics'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.quote_error', fn ($value) => is_string($value) && $value !== '')
        );
});

test('history is empty when no snapshots exist', function () {
    fakeFinanceQuery();

    $this->actingAs($this->user)->get(route('statistics'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('stats.history', []));
});

test('history exposes snapshot points for a single portfolio scope', function () {
    fakeFinanceQuery();

    PortfolioSnapshot::factory()->forPortfolio($this->portfolioA)->onDate('2026-05-20')->create([
        'invested_eur' => 1000,
        'current_value_eur' => 1100,
        'pnl_eur' => 100,
        'position_count' => 1,
    ]);
    PortfolioSnapshot::factory()->forPortfolio($this->portfolioA)->onDate('2026-05-21')->create([
        'invested_eur' => 1000,
        'current_value_eur' => 1200,
        'pnl_eur' => 200,
        'position_count' => 1,
    ]);
    // Another portfolio snapshot — must NOT appear in single-portfolio scope.
    PortfolioSnapshot::factory()->forPortfolio($this->portfolioB)->onDate('2026-05-21')->create([
        'invested_eur' => 500,
        'current_value_eur' => 600,
        'pnl_eur' => 100,
        'position_count' => 1,
    ]);

    $this->actingAs($this->user)
        ->get(route('statistics', ['portfolio' => $this->portfolioA->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('stats.history', 2)
            ->where('stats.history.0.date', '2026-05-20')
            ->where('stats.history.0.value_eur', 1100)
            ->where('stats.history.1.date', '2026-05-21')
            ->where('stats.history.1.value_eur', 1200)
        );
});

test('history aggregates snapshots across all user portfolios for all scope', function () {
    fakeFinanceQuery();

    PortfolioSnapshot::factory()->forPortfolio($this->portfolioA)->onDate('2026-05-21')->create([
        'invested_eur' => 1000,
        'current_value_eur' => 1100,
        'pnl_eur' => 100,
        'position_count' => 1,
    ]);
    PortfolioSnapshot::factory()->forPortfolio($this->portfolioB)->onDate('2026-05-21')->create([
        'invested_eur' => 500,
        'current_value_eur' => 600,
        'pnl_eur' => 100,
        'position_count' => 1,
    ]);

    // Foreign user portfolio — must be excluded.
    $other = User::factory()->create();
    $foreign = Portfolio::factory()->for($other)->create();
    PortfolioSnapshot::factory()->forPortfolio($foreign)->onDate('2026-05-21')->create([
        'invested_eur' => 9999,
        'current_value_eur' => 9999,
        'pnl_eur' => 0,
        'position_count' => 1,
    ]);

    $this->actingAs($this->user)
        ->get(route('statistics'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('stats.history', 1)
            ->where('stats.history.0.date', '2026-05-21')
            ->where('stats.history.0.value_eur', 1700)
            ->where('stats.history.0.invested_eur', 1500)
            ->where('stats.history.0.pnl_eur', 200)
        );
});
