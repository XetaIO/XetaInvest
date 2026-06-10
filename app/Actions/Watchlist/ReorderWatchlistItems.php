<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use Illuminate\Support\Facades\DB;

class ReorderWatchlistItems
{
    /** @param array<int, string> $itemIds */
    public function handle(Watchlist $watchlist, array $itemIds): void
    {
        DB::transaction(function () use ($watchlist, $itemIds): void {
            Watchlist::query()->whereKey($watchlist->getKey())->lockForUpdate()->firstOrFail();

            foreach ($itemIds as $index => $itemId) {
                $watchlist->items()->whereKey($itemId)->update(['position' => $index]);
            }
        });
    }
}
