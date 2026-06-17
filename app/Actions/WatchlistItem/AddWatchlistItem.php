<?php

declare(strict_types=1);

namespace App\Actions\WatchlistItem;

use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
use App\Services\InstrumentResolver;
use Illuminate\Support\Facades\DB;

class AddWatchlistItem
{
    public function __construct(private readonly InstrumentResolver $resolver)
    {
    }

    /**
     * Adds an item to the specified watchlist and section based on the provided symbol. It checks for existing items, handles moving items between sections, and ensures that the watchlist does not exceed its maximum item limit.
     *
     * @param Watchlist $watchlist The watchlist to which the item will be added.
     * @param WatchlistSection $section The section within the watchlist where the item will be added.
     * @param string $symbol The symbol of the instrument to be added to the watchlist.
     *
     * @return string A status message indicating the result of the operation: 'symbol_not_found', 'already_present', 'moved', 'limit_reached', or 'added'.
     */
    public function handle(Watchlist $watchlist, WatchlistSection $section, string $symbol): string
    {
        return DB::transaction(function () use ($watchlist, $section, $symbol): string {
            Watchlist::query()->whereKey($watchlist->getKey())->lockForUpdate()->first();

            $instrument = $this->resolver->resolve($symbol);

            if ($instrument === null) {
                return 'symbol_not_found';
            }

            $existing = $watchlist->items()
                ->where('instrument_id', $instrument->id)
                ->first();

            if ($existing !== null) {
                if ($existing->section_id === $section->id) {
                    return 'already_present';
                }

                $oldSectionId = $existing->section_id;
                $oldPosition = $existing->position;
                $existing->update([
                    'section_id' => $section->id,
                    'position' => (int) $section->items()->max('position') + 1,
                ]);

                WatchlistItem::query()
                    ->where('section_id', $oldSectionId)
                    ->where('position', '>', $oldPosition)
                    ->decrement('position');

                return 'moved';
            }

            if ($watchlist->items()->count() >= Watchlist::MAX_ITEMS) {
                return 'limit_reached';
            }

            $position = (int) $section->items()->max('position') + 1;

            $watchlist->items()->create([
                'section_id' => $section->id,
                'instrument_id' => $instrument->id,
                'position' => $position,
            ]);

            return 'added';
        });
    }
}
