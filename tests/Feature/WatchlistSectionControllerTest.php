<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->watchlist = Watchlist::factory()->forUser($this->user)->create();
    $this->defaultSection = WatchlistSection::factory()
        ->forWatchlist($this->watchlist)
        ->default()
        ->create(['name' => 'Général', 'position' => 0]);
});

test('user can create a section', function () {
    $this->actingAs($this->user)
        ->post(route('watchlists.sections.store', $this->watchlist), [
            'name' => 'Technologie',
        ])
        ->assertRedirect();

    expect($this->watchlist->sections()->where('name', 'Technologie')->exists())->toBeTrue();
});

test('section names must be unique within a watchlist', function () {
    WatchlistSection::factory()->forWatchlist($this->watchlist)->create(['name' => 'Tech']);

    $this->actingAs($this->user)
        ->post(route('watchlists.sections.store', $this->watchlist), [
            'name' => 'Tech',
        ])
        ->assertSessionHasErrors('name');
});

test('user can rename the default section', function () {
    $this->actingAs($this->user)
        ->patch(route('watchlists.sections.update', $this->defaultSection), [
            'name' => 'Principale',
        ])
        ->assertRedirect();

    expect($this->defaultSection->fresh()->name)->toBe('Principale')
        ->and($this->defaultSection->fresh()->is_default)->toBeTrue();
});

test('default section cannot be deleted', function () {
    $this->actingAs($this->user)
        ->delete(route('watchlists.sections.destroy', $this->defaultSection))
        ->assertSessionHasErrors('section');

    expect($this->defaultSection->fresh())->not->toBeNull();
});

test('deleting a section moves its items to the default section', function () {
    $section = WatchlistSection::factory()
        ->forWatchlist($this->watchlist)
        ->create(['position' => 1]);
    $existing = WatchlistItem::factory()
        ->forSection($this->defaultSection)
        ->create(['position' => 0]);
    $moved = WatchlistItem::factory()
        ->forSection($section)
        ->create(['position' => 0]);

    $this->actingAs($this->user)
        ->delete(route('watchlists.sections.destroy', $section))
        ->assertRedirect();

    expect($section->fresh())->toBeNull()
        ->and($existing->fresh()->position)->toBe(0)
        ->and($moved->fresh()->section_id)->toBe($this->defaultSection->id)
        ->and($moved->fresh()->position)->toBe(1);
});

test('user cannot mutate another user section', function () {
    $other = User::factory()->create();
    $watchlist = Watchlist::factory()->forUser($other)->create();
    $section = WatchlistSection::factory()->forWatchlist($watchlist)->default()->create();

    $this->actingAs($this->user)
        ->patch(route('watchlists.sections.update', $section), ['name' => 'Non'])
        ->assertForbidden();

    $this->actingAs($this->user)
        ->delete(route('watchlists.sections.destroy', $section))
        ->assertForbidden();
});
