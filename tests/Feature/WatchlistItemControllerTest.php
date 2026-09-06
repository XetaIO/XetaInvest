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

test('user can add an existing instrument to a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($w)->default()->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), [
            'symbol' => 'AAPL',
            'section_id' => $section->id,
        ])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1)
        ->and($w->items()->first()->instrument_id)->toBe($instrument->id);
});

test('user can add a new symbol that resolves via finance query', function () {
    Http::fake([
        '*finance-query.com/v2/lookup*' => Http::response([
            'quotes' => [
                [
                    'symbol' => 'TSLA',
                    'shortName' => 'Tesla',
                    'exchange' => 'NMS',
                    'quoteType' => 'EQUITY',
                ],
            ],
        ]),
        '*finance-query.com/v2/quotes*' => Http::response([
            'quotes' => [
                [
                    'symbol' => 'TSLA',
                    'name' => 'Tesla Inc.',
                    'exchange' => 'NMS',
                    'quoteType' => 'EQUITY',
                    'currency' => 'usd',
                ],
            ],
        ]),
    ]);

    $w = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($w)->default()->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), [
            'symbol' => 'TSLA',
            'section_id' => $section->id,
        ])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1);
    expect(Instrument::where('symbol', 'TSLA')->first()->currency)->toBe('USD');
});

test('cannot add a symbol twice to the same watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($w)->default()->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);
    WatchlistItem::factory()->forSection($section)->forInstrument($instrument)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), [
            'symbol' => 'AAPL',
            'section_id' => $section->id,
        ])
        ->assertRedirect();

    expect($w->items()->count())->toBe(1);
});

test('cannot exceed max items per watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($w)->default()->create();
    WatchlistItem::factory()->count(Watchlist::MAX_ITEMS)->forSection($section)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), [
            'symbol' => 'NEW',
            'section_id' => $section->id,
        ])
        ->assertRedirect();

    expect($w->items()->count())->toBe(Watchlist::MAX_ITEMS);
});

test('cannot add item to another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();
    $section = WatchlistSection::factory()->forWatchlist($w)->default()->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $w), [
            'symbol' => 'AAPL',
            'section_id' => $section->id,
        ])
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

test('adding an existing symbol to another section moves it', function () {
    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $default = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();
    $target = WatchlistSection::factory()->forWatchlist($watchlist)->create();
    $instrument = Instrument::factory()->create(['symbol' => 'AAPL']);
    $item = WatchlistItem::factory()
        ->forSection($default)
        ->forInstrument($instrument)
        ->create(['position' => 0]);

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $watchlist), [
            'symbol' => 'AAPL',
            'section_id' => $target->id,
        ])
        ->assertRedirect();

    expect($item->fresh()->section_id)->toBe($target->id)
        ->and($watchlist->items()->count())->toBe(1);
});

test('removing an item compacts positions within its section', function () {
    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();
    $first = WatchlistItem::factory()->forSection($section)->create(['position' => 0]);
    $second = WatchlistItem::factory()->forSection($section)->create(['position' => 1]);

    $this->actingAs($this->user)
        ->delete(route('watchlists.items.destroy', $first))
        ->assertRedirect();

    expect($second->fresh()->position)->toBe(0);
});

test('cannot add an item to a section from another watchlist', function () {
    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $ownSection = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();
    $other = Watchlist::factory()->forUser($this->user)->create();
    $otherSection = WatchlistSection::factory()->forWatchlist($other)->default()->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.items.store', $watchlist), [
            'symbol' => 'AAPL',
            'section_id' => $otherSection->id,
        ])
        ->assertSessionHasErrors('section_id');

    expect($ownSection->items()->count())->toBe(0);
});

test('cannot remove an item from another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();
    $item = WatchlistItem::factory()->forWatchlist($w)->create();

    $this->actingAs($this->user)
        ->delete(route('watchlists.items.destroy', $item))
        ->assertForbidden();
});
