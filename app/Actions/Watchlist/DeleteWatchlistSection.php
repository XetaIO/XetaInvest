<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeleteWatchlistSection
{
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
