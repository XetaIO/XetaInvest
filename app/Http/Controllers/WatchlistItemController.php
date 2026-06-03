<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Watchlist\AddWatchlistItem;
use App\Http\Requests\Watchlist\StoreWatchlistItemRequest;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WatchlistItemController extends Controller
{
    public function store(
        StoreWatchlistItemRequest $request,
        Watchlist $watchlist,
        AddWatchlistItem $action,
    ): RedirectResponse {
        $result = $action->handle($watchlist, $request->validated('symbol'));

        match ($result) {
            'symbol_not_found' => Inertia::flash('toast', ['type' => 'error', 'message' => __('messages.watchlist_item.symbol_not_found')]),
            'already_present' => Inertia::flash('toast', ['type' => 'info', 'message' => __('messages.watchlist_item.already_present')]),
            'added' => Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.added')]),
        };

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
