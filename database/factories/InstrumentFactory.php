<?php

namespace Database\Factories;

use App\Models\Instrument;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Instrument>
 */
class InstrumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'symbol' => strtoupper(fake()->unique()->lexify('????')),
            'name' => fake()->company(),
            'exchange' => fake()->randomElement(['NASDAQ', 'NYSE', 'EPA', 'XETRA']),
            'type' => fake()->randomElement(['EQUITY', 'ETF']),
            'currency' => fake()->randomElement(['USD', 'EUR']),
            'last_synced_at' => null,
        ];
    }
}
