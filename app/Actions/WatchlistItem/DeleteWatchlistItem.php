<?php

declare(strict_types=1);

namespace App\Actions\WatchlistItem;

use App\Models\WatchlistItem;
use Illuminate\Support\Facades\DB;

class DeleteWatchlistItem
{
    /**
     * Delete the specified watchlist item and adjusts the positions of other items in the same section accordingly.
     *
     * @param WatchlistItem $item The watchlist item to be removed.
     *
     * @return void
     */
    public function handle(WatchlistItem $item): void
    {
        DB::transaction(function () use ($item): void {
            $sectionId = $item->section_id;
            $position = $item->position;

            $item->delete();

            WatchlistItem::query()
                ->where('section_id', $sectionId)
                ->where('position', '>', $position)
                ->decrement('position');
        });
    }
}
