<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Instrument;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
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
            'section_id' => function (array $attributes): string {
                $watchlist = Watchlist::query()->findOrFail($attributes['watchlist_id']);

                return $watchlist->sections()->firstOrCreate(
                    ['is_default' => true],
                    ['name' => 'Général', 'position' => 0],
                )->id;
            },
            'instrument_id' => Instrument::factory(),
            'position' => 0,
        ];
    }

    public function forWatchlist(Watchlist $watchlist): static
    {
        return $this->state(fn () => [
            'watchlist_id' => $watchlist->id,
            'section_id' => $watchlist->sections()->firstOrCreate(
                ['is_default' => true],
                ['name' => 'Général', 'position' => 0],
            )->id,
        ]);
    }

    public function forSection(WatchlistSection $section): static
    {
        return $this->state(fn () => [
            'watchlist_id' => $section->watchlist_id,
            'section_id' => $section->id,
        ]);
    }

    public function forInstrument(Instrument $instrument): static
    {
        return $this->state(fn () => ['instrument_id' => $instrument->id]);
    }
}
