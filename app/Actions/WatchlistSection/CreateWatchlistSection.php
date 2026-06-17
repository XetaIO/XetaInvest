<?php

declare(strict_types=1);

namespace App\Actions\WatchlistSection;

use App\Models\Watchlist;
use App\Models\WatchlistSection;
use Illuminate\Support\Facades\DB;

class CreateWatchlistSection
{
    /**
     * Creates a new watchlist section for the specified watchlist with the given name. It ensures that the watchlist exists and creates the section with an appropriate position.
     *
     * @param Watchlist $watchlist The watchlist for which the section is being created.
     * @param string $name The name of the new watchlist section.
     *
     * @return WatchlistSection The newly created watchlist section instance.
     */
    public function handle(Watchlist $watchlist, string $name): WatchlistSection
    {
        return DB::transaction(function () use ($watchlist, $name): WatchlistSection {
            Watchlist::query()->whereKey($watchlist->getKey())->lockForUpdate()->firstOrFail();

            return $watchlist->sections()->create([
                'name' => $name,
                'position' => (int) $watchlist->sections()->max('position') + 1,
                'is_default' => false,
            ]);
        });
    }
}
