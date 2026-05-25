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

test('user can add an existing instrument to a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), ['symbol' => 'AAPL'])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1)
        ->and($w->items()->first()->instrument_id)->toBe($instrument->id);
});

test('user can add a new symbol that resolves via finance query', function () {
    Http::fake([
        '*finance-query.com/v1/search*' => Http::response([
            ['symbol' => 'TSLA', 'name' => 'Tesla', 'exchange' => 'NMS', 'type' => 'EQUITY'],
        ]),
        '*finance-query.com/v2/quotes*' => Http::response([
            [
                'symbol' => 'TSLA',
                'name' => 'Tesla Inc.',
                'exchange' => 'NMS',
                'quote_type' => 'EQUITY',
                'currency' => 'usd',
            ],
        ]),
    ]);

    $w = Watchlist::factory()->forUser($this->user)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), ['symbol' => 'TSLA'])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1);
    expect(Instrument::where('symbol', 'TSLA')->first()->currency)->toBe('USD');
});

test('cannot add a symbol twice to the same watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);
    WatchlistItem::factory()->forWatchlist($w)->forInstrument($instrument)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), ['symbol' => 'AAPL'])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1);
});

test('cannot exceed max items per watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    WatchlistItem::factory()->count(Watchlist::MAX_ITEMS)->forWatchlist($w)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), ['symbol' => 'NEW'])
        ->assertForbidden();
});

test('cannot add item to another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), ['symbol' => 'AAPL'])
        ->assertForbidden();
});

test('user can remove an item from a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $item = WatchlistItem::factory()->forWatchlist($w)->create();

    $this->actingAs($this->user)
        ->delete(route('watchlists.items.destroy', $item))
        ->assertRedirect();

    expect(WatchlistItem::find($item->id))->toBeNull();
});

test('cannot remove an item from another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();
    $item = WatchlistItem::factory()->forWatchlist($w)->create();

    $this->actingAs($this->user)
        ->delete(route('watchlists.items.destroy', $item))
        ->assertForbidden();
});
