<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\WatchlistItem;
use Illuminate\Support\Facades\DB;

class RemoveWatchlistItem
{
    public function handle(WatchlistItem $item): void
    {
        DB::transaction(function () use ($item): void {
            $watchlistId = $item->watchlist_id;
            $position = $item->position;

            $item->delete();

            WatchlistItem::query()
                ->where('watchlist_id', $watchlistId)
                ->where('position', '>', $position)
                ->decrement('position');
        });
    }
}
