<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use App\Services\InstrumentResolver;
use Illuminate\Support\Facades\DB;

class AddWatchlistItem
{
    public function __construct(private readonly InstrumentResolver $resolver)
    {
    }

    /**
     * @return 'added'|'symbol_not_found'|'already_present'|'limit_reached'
     */
    public function handle(Watchlist $watchlist, string $symbol): string
    {
        return DB::transaction(function () use ($watchlist, $symbol): string {
            $count = $watchlist->items()->lockForUpdate()->count();
            if ($count >= Watchlist::MAX_ITEMS) {
                return 'limit_reached';
            }

            $instrument = $this->resolver->resolve($symbol);

            if ($instrument === null) {
                return 'symbol_not_found';
            }

            if ($watchlist->items()->where('instrument_id', $instrument->id)->exists()) {
                return 'already_present';
            }

            $position = (int) $watchlist->items()->max('position') + 1;

            $watchlist->items()->create([
                'instrument_id' => $instrument->id,
                'position' => $position,
            ]);

            return 'added';
        });
    }
}
