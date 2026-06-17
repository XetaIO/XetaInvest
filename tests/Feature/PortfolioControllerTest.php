<?php

declare(strict_types=1);

use App\Models\Portfolio;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('user can create a portfolio', function () {
    $this->actingAs($this->user)
        ->post(route('portfolios.store'), ['name' => 'Long term'])
        ->assertRedirect();

    expect($this->user->portfolios()->count())->toBe(1)
        ->and($this->user->portfolios()->first()->is_default)->toBeTrue();
});

test('first portfolio is always default', function () {
    $this->actingAs($this->user)
        ->post(route('portfolios.store'), ['name' => 'First', 'is_default' => false]);

    expect($this->user->portfolios()->first()->is_default)->toBeTrue();
});

test('setting a portfolio as default unsets the others', function () {
    $a = Portfolio::factory()->forUser($this->user)->default()->create();
    $b = Portfolio::factory()->forUser($this->user)->create(['is_default' => false]);

    $this->actingAs($this->user)
        ->patch(route('portfolios.default', $b))
        ->assertRedirect();

    expect($a->fresh()->is_default)->toBeFalse()
        ->and($b->fresh()->is_default)->toBeTrue();
});

test('user cannot exceed the portfolio limit', function () {
    Portfolio::factory()->count(Portfolio::MAX_PER_USER)->forUser($this->user)->create();

    $this->actingAs($this->user)
        ->post(route('portfolios.store'), ['name' => 'Overflow'])
        ->assertForbidden();
});

test('user cannot manage another user portfolio', function () {
    $other = User::factory()->create();
    $portfolio = Portfolio::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->patch(route('portfolios.update', $portfolio), ['name' => 'Hacked'])
        ->assertForbidden();
});

test('user cannot delete another user portfolio', function () {
    $other = User::factory()->create();
    $portfolio = Portfolio::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->delete(route('portfolios.destroy', $portfolio))
        ->assertForbidden();
});

test('user cannot set default on another user portfolio', function () {
    $other = User::factory()->create();
    $portfolio = Portfolio::factory()->forUser($other)->create();

    $this->actingAs($this->user)
        ->patch(route('portfolios.default', $portfolio))
        ->assertForbidden();
});

test('duplicate name within same user is rejected', function () {
    Portfolio::factory()->forUser($this->user)->create(['name' => 'Same']);

    $this->actingAs($this->user)
        ->post(route('portfolios.store'), ['name' => 'Same'])
        ->assertSessionHasErrors('name');
});

test('guest cannot create a portfolio', function () {
    $this->post(route('portfolios.store'), ['name' => 'X'])
        ->assertRedirect(route('login'));
});

test('deleting the default portfolio promotes another to default', function () {
    $a = Portfolio::factory()->forUser($this->user)->default()->create();
    $b = Portfolio::factory()->forUser($this->user)->create(['is_default' => false]);

    $this->actingAs($this->user)
        ->delete(route('portfolios.destroy', $a))
        ->assertRedirect();

    expect($b->fresh()->is_default)->toBeTrue();
});
