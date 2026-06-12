<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;

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
        ->and($this->user->watchlists()->first()->name)->toBe('Tech')
        ->and($this->user->watchlists()->first()->sections()->count())->toBe(1)
        ->and($this->user->watchlists()->first()->sections()->first()->is_default)->toBeTrue();
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
    $default = WatchlistSection::factory()->forWatchlist($w)->default()->create(['position' => 0]);
    $other = WatchlistSection::factory()->forWatchlist($w)->create(['position' => 1]);
    $i1 = WatchlistItem::factory()->forSection($default)->create(['position' => 0]);
    $i2 = WatchlistItem::factory()->forSection($default)->create(['position' => 1]);

    $this->actingAs($this->user)
        ->patch(route('watchlists.reorder', $w), [
            'sections' => [
                ['id' => $other->id, 'item_ids' => [$i2->id]],
                ['id' => $default->id, 'item_ids' => [$i1->id]],
            ],
        ])
        ->assertRedirect();

    expect($other->fresh()->position)->toBe(0)
        ->and($default->fresh()->position)->toBe(1)
        ->and($i1->fresh()->section_id)->toBe($default->id)
        ->and($i1->fresh()->position)->toBe(0)
        ->and($i2->fresh()->section_id)->toBe($other->id)
        ->and($i2->fresh()->position)->toBe(0);
});

test('reorder requires every section and item exactly once', function () {
    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();
    $item = WatchlistItem::factory()->forSection($section)->create(['position' => 0]);
    WatchlistItem::factory()->forSection($section)->create(['position' => 1]);

    $this->actingAs($this->user)
        ->patch(route('watchlists.reorder', $watchlist), [
            'sections' => [
                ['id' => $section->id, 'item_ids' => [$item->id]],
            ],
        ])
        ->assertSessionHasErrors('sections');
});

test('reorder rejects sections and items from another watchlist', function () {
    $watchlist = Watchlist::factory()->forUser($this->user)->create();
    $section = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();
    $other = Watchlist::factory()->forUser($this->user)->create();
    $otherSection = WatchlistSection::factory()->forWatchlist($other)->default()->create();
    $otherItem = WatchlistItem::factory()->forSection($otherSection)->create();

    $this->actingAs($this->user)
        ->patch(route('watchlists.reorder', $watchlist), [
            'sections' => [
                ['id' => $section->id, 'item_ids' => [$otherItem->id]],
            ],
        ])
        ->assertSessionHasErrors('sections.0.item_ids.0');
});
