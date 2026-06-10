<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('guest cannot access summary', function () {
    $this->getJson(route('api.watchlists.summary'))->assertStatus(401);
});

test('summary returns only user watchlists', function () {
    Watchlist::factory()->forUser($this->user)->create(['name' => 'Mine A']);
    Watchlist::factory()->forUser($this->user)->create(['name' => 'Mine B']);
    Watchlist::factory()->forUser(User::factory()->create())->create(['name' => 'Other']);

    $response = $this->actingAs($this->user)->getJson(route('api.watchlists.summary'));

    $response->assertOk()->assertJsonCount(2, 'data');
    $names = collect($response->json('data'))->pluck('name')->all();
    expect($names)->toContain('Mine A', 'Mine B')->not->toContain('Other');
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
