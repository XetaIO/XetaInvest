<?php

namespace Database\Factories;

use App\Models\Portfolio;
use App\Models\PortfolioSnapshot;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PortfolioSnapshot>
 */
class PortfolioSnapshotFactory extends Factory
{
    public function definition(): array
    {
        $invested = $this->faker->randomFloat(2, 1000, 50000);
        $current = $invested * $this->faker->randomFloat(4, 0.8, 1.4);

        return [
            'portfolio_id' => Portfolio::factory(),
            'captured_on' => now()->toDateString(),
            'invested_eur' => $invested,
            'current_value_eur' => $current,
            'pnl_eur' => $current - $invested,
            'position_count' => $this->faker->numberBetween(1, 10),
            'quote_error' => false,
        ];
    }

    public function forPortfolio(Portfolio $portfolio): static
    {
        return $this->state(fn () => ['portfolio_id' => $portfolio->id]);
    }

    public function onDate(CarbonInterface|string $date): static
    {
        return $this->state(fn () => [
            'captured_on' => $date instanceof CarbonInterface ? $date->toDateString() : $date,
        ]);
    }
}
