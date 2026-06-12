<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('guest cannot access summary', function () {
    $this->getJson(route('api.watchlists.summary'))->assertStatus(401);
});

test('summary returns only user watchlists', function () {
    $first = Watchlist::factory()->forUser($this->user)->create(['name' => 'Mine A']);
    $firstSection = WatchlistSection::factory()->forWatchlist($first)->default()->create();
    $second = Watchlist::factory()->forUser($this->user)->create(['name' => 'Mine B']);
    WatchlistSection::factory()->forWatchlist($second)->default()->create();
    Watchlist::factory()->forUser(User::factory()->create())->create(['name' => 'Other']);

    $response = $this->actingAs($this->user)->getJson(route('api.watchlists.summary'));

    $response->assertOk()->assertJsonCount(2, 'data');
    $summaries = collect($response->json('data'));
    $names = $summaries->pluck('name')->all();
    expect($names)->toContain('Mine A', 'Mine B')->not->toContain('Other')
        ->and($summaries->firstWhere('name', 'Mine A')['default_section_id'])->toBe($firstSection->id);
});

test('history only accepts symbols from the user watchlists', function () {
    Http::preventStrayRequests();

    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);
    WatchlistItem::factory()->forWatchlist($watchlist)->create([
        'instrument_id' => $instrument->id,
    ]);

    $this->actingAs($this->user)
        ->getJson(route('api.watchlists.history', ['symbols' => 'MSFT']))
        ->assertOk()
        ->assertExactJson(['data' => []]);
});
