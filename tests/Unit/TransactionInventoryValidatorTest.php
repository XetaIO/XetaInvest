<?php

declare(strict_types=1);

use App\Enums\TransactionType;
use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use App\Models\Transaction;
use App\Models\User;
use App\Services\TransactionInventoryValidator;
use Illuminate\Validation\ValidationException;

beforeEach(function (): void {
    $this->validator = new TransactionInventoryValidator();
    $this->portfolio = Portfolio::factory()->forUser(User::factory()->create())->create();
    $this->instrument = Instrument::factory()->create();
    $this->position = Position::factory()->forPortfolio($this->portfolio)->forInstrument($this->instrument)->create();
});

test('validate passes for buy-only inventory', function (): void {
    Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 5,
        'executed_at' => '2026-01-01',
    ]);

    $this->validator->validate($this->position->refresh());
})->throwsNoExceptions();

test('validate passes when sells stay within available quantity', function (): void {
    Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 10,
        'executed_at' => '2026-01-01',
    ]);
    Transaction::factory()->forPosition($this->position)->sell()->create([
        'quantity' => 4,
        'executed_at' => '2026-01-02',
    ]);

    $this->validator->validate($this->position->refresh());
})->throwsNoExceptions();

test('validate rejects sell exceeding available quantity', function (): void {
    Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 5,
        'executed_at' => '2026-01-01',
    ]);
    Transaction::factory()->forPosition($this->position)->sell()->create([
        'quantity' => 6,
        'executed_at' => '2026-01-02',
    ]);

    $this->validator->validate($this->position->refresh());
})->throws(ValidationException::class);

test('validate rejects sell on empty position', function (): void {
    Transaction::factory()->forPosition($this->position)->create([
        'type' => TransactionType::Sell,
        'quantity' => 1,
        'executed_at' => '2026-01-01',
    ]);

    $this->validator->validate($this->position->refresh());
})->throws(ValidationException::class);

test('validate allows sell within float tolerance', function (): void {
    Transaction::factory()->forPosition($this->position)->buy()->create([
        'quantity' => 1.0000001,
        'executed_at' => '2026-01-01',
    ]);
    Transaction::factory()->forPosition($this->position)->sell()->create([
        'quantity' => 1.0,
        'executed_at' => '2026-01-02',
    ]);

    $this->validator->validate($this->position->refresh());
})->throwsNoExceptions();
