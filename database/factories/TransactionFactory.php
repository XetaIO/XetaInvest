<?php

namespace Database\Factories;

use App\Enums\TransactionType;
use App\Models\Position;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'position_id' => Position::factory(),
            'type' => TransactionType::Buy,
            'quantity' => fake()->randomFloat(4, 0.1, 100),
            'unit_price' => fake()->randomFloat(4, 1, 500),
            'executed_at' => fake()->dateTimeBetween('-2 years', 'now')->format('Y-m-d'),
            'notes' => null,
        ];
    }

    public function buy(): static
    {
        return $this->state(fn () => ['type' => TransactionType::Buy]);
    }

    public function sell(): static
    {
        return $this->state(fn () => ['type' => TransactionType::Sell]);
    }

    public function forPosition(Position $position): static
    {
        return $this->state(fn () => ['position_id' => $position->id]);
    }
}
