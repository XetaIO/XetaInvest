<?php

declare(strict_types=1);

namespace App\Actions\Watchlist;

use App\Models\Watchlist;
use App\Services\InstrumentResolver;

class AddWatchlistItem
{
    public function __construct(private readonly InstrumentResolver $resolver)
    {
    }

    /**
     * @return 'added'|'symbol_not_found'|'already_present'
     */
    public function handle(Watchlist $watchlist, string $symbol): string
    {
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
    }
}
