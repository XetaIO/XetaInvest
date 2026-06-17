<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use Illuminate\Support\Facades\DB;

class DeleteWatchlist
{
    /**
     * Delete the specified watchlist and adjusts the positions of other watchlists for the same user accordingly.
     *
     * @param Watchlist $watchlist The watchlist to be removed.
     *
     * @return void
     */
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
