<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Cache::flush();
    $this->user = User::factory()->create();
});

test('guest is redirected from symbol search', function () {
    $this->getJson('/symbol-search?q=AAP')->assertStatus(401);
});

test('authenticated user can search symbols', function () {
    Http::fake([
        '*finance-query.com/v1/search*' => Http::response([
            ['symbol' => 'AAPL', 'name' => 'Apple Inc.', 'exchange' => 'NMS', 'type' => 'EQUITY'],
            ['symbol' => 'AAP', 'name' => 'Advance Auto Parts', 'exchange' => 'NYQ', 'type' => 'EQUITY'],
        ]),
    ]);

    $this->actingAs($this->user)->getJson('/symbol-search?q=AAP')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.symbol', 'AAPL');
});

test('short query returns empty list without calling API', function () {
    Http::fake();

    $this->actingAs($this->user)->getJson('/symbol-search?q=a')
        ->assertOk()
        ->assertExactJson(['data' => []]);

    Http::assertNothingSent();
});

test('empty query returns empty list', function () {
    $this->actingAs($this->user)->getJson('/symbol-search')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});
