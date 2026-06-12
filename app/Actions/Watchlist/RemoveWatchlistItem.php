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
