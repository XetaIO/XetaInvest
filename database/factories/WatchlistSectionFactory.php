<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Watchlist;
use App\Models\WatchlistSection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WatchlistSection>
 */
class WatchlistSectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'watchlist_id' => Watchlist::factory(),
            'name' => fake()->unique()->words(2, true),
            'position' => 0,
            'is_default' => false,
        ];
    }

    public function forWatchlist(Watchlist $watchlist): static
    {
        return $this->state(fn () => ['watchlist_id' => $watchlist->id]);
    }

    public function default(): static
    {
        return $this->state(fn () => ['is_default' => true]);
    }
}
