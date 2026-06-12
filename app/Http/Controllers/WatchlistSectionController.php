<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Watchlist\CreateWatchlistSection;
use App\Actions\Watchlist\DeleteWatchlistSection;
use App\Actions\Watchlist\RenameWatchlistSection;
use App\Http\Requests\Watchlist\DeleteWatchlistSectionRequest;
use App\Http\Requests\Watchlist\StoreWatchlistSectionRequest;
use App\Http\Requests\Watchlist\UpdateWatchlistSectionRequest;
use App\Models\Watchlist;
use App\Models\WatchlistSection;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class WatchlistSectionController extends Controller
{
    public function store(
        StoreWatchlistSectionRequest $request,
        Watchlist $watchlist,
        CreateWatchlistSection $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('name'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_section.created')]);

        return back();
    }

    public function update(
        UpdateWatchlistSectionRequest $request,
        WatchlistSection $section,
        RenameWatchlistSection $action,
    ): RedirectResponse {
        $action->handle($section, $request->validated('name'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_section.renamed')]);

        return back();
    }

    public function destroy(
        DeleteWatchlistSectionRequest $request,
        WatchlistSection $section,
        DeleteWatchlistSection $action,
    ): RedirectResponse {
        $action->handle($section);
        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_section.deleted')]);

        return back();
    }
}
