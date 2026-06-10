<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;

class RenameWatchlist
{
    public function handle(Watchlist $watchlist, string $name): Watchlist
    {
        $watchlist->update(['name' => $name]);

        return $watchlist->refresh();
    }
}
