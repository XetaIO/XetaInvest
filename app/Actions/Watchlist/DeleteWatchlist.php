<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use Illuminate\Support\Facades\DB;

class DeleteWatchlist
{
    public function handle(Watchlist $watchlist): void
    {
        DB::transaction(function () use ($watchlist): void {
            $userId = $watchlist->user_id;
            $position = $watchlist->position;

            $watchlist->delete();

            Watchlist::query()
                ->where('user_id', $userId)
                ->where('position', '>', $position)
                ->decrement('position');
        });
    }
}
