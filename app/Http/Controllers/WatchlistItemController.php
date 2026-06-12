<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Watchlist\AddWatchlistItem;
use App\Actions\Watchlist\RemoveWatchlistItem;
use App\Http\Requests\Watchlist\StoreWatchlistItemRequest;
use App\Models\Watchlist;
use App\Models\WatchlistItem;
use App\Models\WatchlistSection;
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
        $section = WatchlistSection::query()->findOrFail($request->validated('section_id'));
        $result = $action->handle($watchlist, $section, $request->validated('symbol'));

        match ($result) {
            'symbol_not_found' => Inertia::flash('toast', ['type' => 'error', 'message' => __('messages.watchlist_item.symbol_not_found')]),
            'already_present' => Inertia::flash('toast', ['type' => 'info', 'message' => __('messages.watchlist_item.already_present')]),
            'moved' => Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.moved')]),
            'added' => Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.added')]),
            'limit_reached' => Inertia::flash('toast', ['type' => 'error', 'message' => __('messages.watchlist_item.limit_reached', ['max' => Watchlist::MAX_ITEMS])]),
        };

        return back();
    }

    public function destroy(
        Request $request,
        WatchlistItem $item,
        RemoveWatchlistItem $action,
    ): RedirectResponse {
        $this->authorize('delete', $item);
        $action->handle($item);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_item.removed')]);

        return back();
    }
}
