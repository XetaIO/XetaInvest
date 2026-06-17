<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use Illuminate\Support\Facades\DB;

class ReorderWatchlist
{
    /**
     * Reorders the sections and items of the specified watchlist based on the provided layout data.
     *
     * @param Watchlist $watchlist The watchlist to be reordered.
     * @param array $sections An array containing the new order of sections and their associated items.
     *
     * @return void
     */
    public function handle(Watchlist $watchlist, array $sections): void
    {
        DB::transaction(function () use ($watchlist, $sections): void {
            Watchlist::query()->whereKey($watchlist->getKey())->lockForUpdate()->firstOrFail();

            foreach ($sections as $sectionPosition => $sectionData) {
                $section = $watchlist->sections()->whereKey($sectionData['id'])->firstOrFail();
                $section->update(['position' => $sectionPosition]);

                foreach ($sectionData['item_ids'] as $itemPosition => $itemId) {
                    $watchlist->items()->whereKey($itemId)->update([
                        'section_id' => $section->id,
                        'position' => $itemPosition,
                    ]);
                }
            }
        });
    }
}
