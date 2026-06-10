<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Instrument;
use App\Models\Portfolio;
use App\Models\Position;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Position>
 */
class PositionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'portfolio_id' => Portfolio::factory(),
            'instrument_id' => Instrument::factory(),
        ];
    }

    public function forPortfolio(Portfolio $portfolio): static
    {
        return $this->state(fn () => ['portfolio_id' => $portfolio->id]);
    }

    public function forInstrument(Instrument $instrument): static
    {
        return $this->state(fn () => ['instrument_id' => $instrument->id]);
    }
}
