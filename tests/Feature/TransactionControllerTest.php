<?php

declare(strict_types=1);

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->portfolio = Portfolio::factory()->forUser($this->user)->create();
    $instrument = Instrument::factory()->create();
    $this->position = Position::factory()->forPortfolio($this->portfolio)->forInstrument($instrument)->create();
});

test('user can add a transaction to their position', function () {
    $this->actingAs($this->user)
        ->post(route('transactions.store', $this->position), [
            'type' => 'buy',
            'quantity' => 5,
            'unit_price' => 200,
            'executed_at' => '2026-03-15',
        ])
        ->assertRedirect();

    expect($this->position->transactions()->count())->toBe(1);
});

test('user cannot sell more units than are held at the transaction date', function () {
    Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 4,
        'executed_at' => '2026-03-14',
    ]);

    $this->actingAs($this->user)
        ->post(route('transactions.store', $this->position), [
            'type' => 'sell',
            'quantity' => 5,
            'unit_price' => 200,
            'executed_at' => '2026-03-15',
        ])
        ->assertSessionHasErrors('quantity');

    expect($this->position->transactions()->count())->toBe(1);
});

test('user can update their transaction', function () {
    $tx = Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 1, 'unit_price' => 100,
    ]);

    $this->actingAs($this->user)
        ->patch(route('transactions.update', $tx), [
            'type' => 'buy',
            'quantity' => 2,
            'unit_price' => 110,
            'executed_at' => '2026-01-01',
        ])
        ->assertRedirect();

    expect((float) $tx->fresh()->quantity)->toBe(2.0);
});

test('user can delete their transaction', function () {
    $tx = Transaction::factory()->forPosition($this->position)->buy()->create();

    $this->actingAs($this->user)
        ->delete(route('transactions.destroy', $tx))
        ->assertRedirect();

    expect(Transaction::find($tx->id))->toBeNull();
});

test('user cannot delete a buy required by a later sell', function () {
    $buy = Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 5,
        'executed_at' => '2026-01-01',
    ]);
    Transaction::factory()->forPosition($this->position)->sell()->create([
        'quantity' => 5,
        'executed_at' => '2026-01-02',
    ]);

    $this->actingAs($this->user)
        ->delete(route('transactions.destroy', $buy))
        ->assertSessionHasErrors('quantity');

    expect(Transaction::find($buy->id))->not->toBeNull();
});

test('user cannot touch another user transaction', function () {
    $other = User::factory()->create();
    $tx = Transaction::factory()->forPosition($this->position)->buy()->create();

    $this->actingAs($other)
        ->delete(route('transactions.destroy', $tx))
        ->assertForbidden();
});

test('transaction validates quantity is positive', function () {
    $this->actingAs($this->user)
        ->post(route('transactions.store', $this->position), [
            'type' => 'buy', 'quantity' => 0, 'unit_price' => 1, 'executed_at' => '2026-01-01',
        ])
        ->assertSessionHasErrors('quantity');
});
