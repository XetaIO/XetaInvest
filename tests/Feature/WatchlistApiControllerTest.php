<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Watchlist;

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
