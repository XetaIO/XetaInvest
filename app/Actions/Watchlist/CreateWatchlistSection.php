<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use App\Models\WatchlistSection;
use Illuminate\Support\Facades\DB;

class CreateWatchlistSection
{
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
