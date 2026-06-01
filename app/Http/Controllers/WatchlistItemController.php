<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Watchlist\StoreWatchlistItemRequest;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Services\InstrumentResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WatchlistItemController extends Controller
{
    public function store(
        StoreWatchlistItemRequest $request,
        Watchlist $watchlist,
        InstrumentResolver $resolver,
    ): RedirectResponse {
        $instrument = $resolver->resolve($request->validated('symbol'));

        if ($instrument === null) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('messages.watchlist_item.symbol_not_found')]);

            return back();
        }

        if ($watchlist->items()->where('instrument_id', $instrument->id)->exists()) {
            Inertia::flash('toast', ['type' => 'info', 'message' => __('messages.watchlist_item.already_present')]);

            return back();
        }

        $position = (int) $watchlist->items()->max('position') + 1;

        $watchlist->items()->create([
            'instrument_id' => $instrument->id,
            'position' => $position,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.added')]);

        return back();
    }

    public function destroy(Request $request, WatchlistItem $item): RedirectResponse
    {
        $this->authorize('delete', $item);

        $item->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.removed')]);

        return back();
    }
}
