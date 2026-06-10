<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
    $this->user = User::factory()->create();

    $this->portfolio = Portfolio::factory()->for($this->user)->create([
        'name' => 'Main',
        'is_default' => true,
    ]);

    $this->apple = Instrument::factory()->create([
        'symbol' => 'AAPL',
        'name' => 'Apple',
        'currency' => 'USD',
        'type' => 'EQUITY',
    ]);
    $this->microsoft = Instrument::factory()->create([
        'symbol' => 'MSFT',
        'name' => 'Microsoft',
        'currency' => 'USD',
        'type' => 'EQUITY',
    ]);

    foreach ([$this->apple, $this->microsoft] as $instr) {
        $pos = Position::factory()->forPortfolio($this->portfolio)->forInstrument($instr)->create();
        Transaction::factory()->forPosition($pos)->buy()->create([
            'quantity' => 1,
            'unit_price' => 100,
            'executed_at' => now()->subMonth()->toDateString(),
        ]);
    }
});

function fakeNews(): void
{
    Http::fake([
        '*finance-query.com/v2/news/*' => function ($request) {
            $url = $request->url();
            preg_match('#/v2/news/([^/?]+)#', $url, $m);
            $symbol = $m[1] ?? 'UNK';

            $items = [];
            // 7 items so we can assert per-symbol limit of 5 kicks in
            for ($i = 1; $i <= 7; $i++) {
                $items[] = [
                    'img' => "https://img.example/{$symbol}-{$i}.png",
                    'link' => "https://news.example/{$symbol}/{$i}",
                    'provider_id' => 'prov',
                    'source' => 'Example News',
                    'time' => $i.' hours ago',
                    'title' => "{$symbol} story {$i}",
                ];
            }

            return Http::response($items);
        },
    ]);
}

test('guest is redirected from news page', function () {
    $this->get(route('news'))->assertRedirect(route('login'));
});

test('authenticated user sees news for all portfolio symbols', function () {
    fakeNews();

    $this->actingAs($this->user)->get(route('news'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('news')
                ->where('scope.symbol', null)
                ->has('available_symbols', 2)
                ->where('available_symbols.0', 'AAPL')
                ->where('available_symbols.1', 'MSFT')
                ->has('news.data', 10) // 5 per symbol * 2 symbols
                ->where('news.current_page', 1)
                ->where('news.total', 10)
        );
});

test('user can filter news by a specific symbol', function () {
    fakeNews();

    $this->actingAs($this->user)->get(route('news', ['symbol' => 'AAPL']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->where('scope.symbol', 'AAPL')
                ->has('news.data', 7) // no per-symbol limit when filtered
                ->where('news.data.0.symbol', 'AAPL')
        );
});

test('foreign symbol filter falls back to all', function () {
    fakeNews();

    $this->actingAs($this->user)->get(route('news', ['symbol' => 'TSLA']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('scope.symbol', null));
});

test('news are cached between requests', function () {
    fakeNews();

    $this->actingAs($this->user)->get(route('news'))->assertOk();
    $first = count(Http::recorded());

    $this->actingAs($this->user)->get(route('news'))->assertOk();
    expect(count(Http::recorded()))->toBe($first);
});

test('pagination respects page query parameter', function () {
    // Force enough items to spill onto page 2 by creating many symbols
    for ($i = 0; $i < 20; $i++) {
        $instr = Instrument::factory()->create([
            'symbol' => 'SYM'.$i,
            'currency' => 'USD',
            'type' => 'EQUITY',
        ]);
        $pos = Position::factory()->forPortfolio($this->portfolio)->forInstrument($instr)->create();
        Transaction::factory()->forPosition($pos)->buy()->create([
            'quantity' => 1,
            'unit_price' => 10,
            'executed_at' => now()->subMonth()->toDateString(),
        ]);
    }

    fakeNews();

    $this->actingAs($this->user)->get(route('news', ['page' => 2]))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->where('news.current_page', 2)
                ->where('news.per_page', 20)
        );
});

test('relative news links are resolved to absolute stockanalysis.com URLs', function () {
    Http::fake([
        '*finance-query.com/v2/news/*' => Http::response([
            [
                'img' => 'https://img.example/a.png',
                'link' => '/quote/epa/AAPL/filings/123/',
                'provider_id' => 'prov',
                'source' => 'Yahoo',
                'time' => '1 hour ago',
                'title' => 'Relative link story',
            ],
            [
                'img' => 'https://img.example/b.png',
                'link' => 'https://www.reuters.com/article/abc',
                'provider_id' => 'prov',
                'source' => 'Reuters',
                'time' => '2 hours ago',
                'title' => 'Absolute link story',
            ],
        ]),
    ]);

    $this->actingAs($this->user)->get(route('news', ['symbol' => 'AAPL']))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->where('news.data.0.link', 'https://stockanalysis.com/quote/epa/AAPL/filings/123/')
                ->where('news.data.1.link', 'https://www.reuters.com/article/abc')
        );
});
