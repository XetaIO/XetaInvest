<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;

class UpdateWatchlist
{
    /**
     * Update the specified watchlist's name.
     *
     * @param Watchlist $watchlist The watchlist to be updated.
     * @param string $name The new name for the watchlist.
     *
     * @return Watchlist The updated watchlist instance.
     */
    public function handle(Watchlist $watchlist, string $name): Watchlist
    {
        $watchlist->update(['name' => $name]);

        return $watchlist->refresh();
    }
}
