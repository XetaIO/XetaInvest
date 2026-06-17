<?php

declare(strict_types=1);

namespace App\Actions\WatchlistSection;

use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteWatchlistSection
{
    /**
     * Delete the specified watchlist section and adjusts the positions of other sections for the same watchlist accordingly.
     * If the section is not default, it moves its items to the default section before deletion.
     *
     * @param WatchlistSection $section The watchlist section to be removed.
     *
     * @return void
     *
     * @throws ValidationException If the section is a default section and cannot be deleted.
     */
    public function handle(WatchlistSection $section): void
    {
        DB::transaction(function () use ($section): void {
            $watchlist = Watchlist::query()
                ->whereKey($section->watchlist_id)
                ->lockForUpdate()
                ->firstOrFail();
            $section = WatchlistSection::query()->whereKey($section->getKey())->lockForUpdate()->firstOrFail();

            if ($section->is_default) {
                throw ValidationException::withMessages([
                    'section' => __('messages.watchlist_section.default_protected'),
                ]);
            }

            $default = $watchlist->sections()
                ->where('is_default', true)
                ->lockForUpdate()
                ->firstOrFail();
            $nextPosition = (int) $default->items()->max('position') + 1;

            $section->items()->get()->each(function (WatchlistItem $item) use ($default, &$nextPosition): void {
                $item->update([
                    'section_id' => $default->id,
                    'position' => $nextPosition++,
                ]);
            });

            $position = $section->position;
            $section->delete();

            WatchlistSection::query()
                ->where('watchlist_id', $watchlist->id)
                ->where('position', '>', $position)
                ->decrement('position');
        });
    }
}
