<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\WatchlistSection;

class RenameWatchlistSection
{
    public function handle(WatchlistSection $section, string $name): WatchlistSection
    {
        $section->update(['name' => $name]);

        return $section->refresh();
    }
}
