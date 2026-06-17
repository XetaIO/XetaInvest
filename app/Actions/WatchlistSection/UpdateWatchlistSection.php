<?php

declare(strict_types=1);

namespace App\Actions\WatchlistSection;

use App\Models\WatchlistSection;

class UpdateWatchlistSection
{
    /**
     * Update the specified watchlist section's name.
     *
     * @param WatchlistSection $section The watchlist section to be updated.
     * @param string $name The new name for the watchlist section.
     *
     * @return WatchlistSection The updated watchlist section instance.
     */
    public function handle(WatchlistSection $section, string $name): WatchlistSection
    {
        $section->update(['name' => $name]);

        return $section->refresh();
    }
}
