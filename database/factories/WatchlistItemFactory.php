<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Instrument;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WatchlistItem>
 */
class WatchlistItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'watchlist_id' => Watchlist::factory(),
            'instrument_id' => Instrument::factory(),
            'position' => 0,
        ];
    }

    public function forWatchlist(Watchlist $watchlist): static
    {
        return $this->state(fn () => ['watchlist_id' => $watchlist->id]);
    }

    public function forInstrument(Instrument $instrument): static
    {
        return $this->state(fn () => ['instrument_id' => $instrument->id]);
    }
}
