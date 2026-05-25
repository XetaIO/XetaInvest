<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchlistItem;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('guest is redirected from watchlists index', function () {
    $this->get(route('watchlists.index'))->assertRedirect(route('login'));
});

test('user can view watchlists index', function () {
    $this->actingAs($this->user)
        ->get(route('watchlists.index'))
        ->assertOk();
});

test('user can create a watchlist', function () {
    $this->actingAs($this->user)
        ->post(route('watchlists.store'), ['name' => 'Tech'])
        ->assertRedirect();

    expect($this->user->watchlists()->count())->toBe(1)
        ->and($this->user->watchlists()->first()->name)->toBe('Tech');
});

test('user cannot exceed the watchlist limit', function () {
    Watchlist::factory()->count(Watchlist::MAX_PER_USER)->forUser($this->user)->create();

    $this->actingAs($this->user)
        ->post(route('watchlists.store'), ['name' => 'Overflow'])
        ->assertForbidden();
});

test('duplicate name within same user is rejected', function () {
    Watchlist::factory()->forUser($this->user)->create(['name' => 'Same']);

    $this->actingAs($this->user)
        ->post(route('watchlists.store'), ['name' => 'Same'])
        ->assertSessionHasErrors('name');
});

test('user can rename a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create(['name' => 'Old']);

    $this->actingAs($this->user)
        ->patch(route('watchlists.update', $w), ['name' => 'New'])
        ->assertRedirect();

    expect($w->fresh()->name)->toBe('New');
});

test('user cannot rename another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->patch(route('watchlists.update', $w), ['name' => 'Hacked'])
        ->assertForbidden();
});

test('user can delete a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();

    $this->actingAs($this->user)
        ->delete(route('watchlists.destroy', $w))
        ->assertRedirect();

    expect(Watchlist::find($w->id))->toBeNull();
});

test('user cannot delete another user watchlist', function () {
    $other = User::factory()->create();
    $w = Watchlist::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->delete(route('watchlists.destroy', $w))
        ->assertForbidden();
});

test('user can reorder items in a watchlist', function () {
    $w = Watchlist::factory()->forUser($this->user)->create();
    $i1 = WatchlistItem::factory()->forWatchlist($w)->create(['position' => 0]);
    $i2 = WatchlistItem::factory()->forWatchlist($w)->create(['position' => 1]);

    $this->actingAs($this->user)
        ->patch(route('watchlists.reorder', $w), [
            'item_ids' => [$i2->id, $i1->id],
        ])
        ->assertRedirect();

    expect($i1->fresh()->position)->toBe(1)
        ->and($i2->fresh()->position)->toBe(0);
});
