<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\WatchlistSection\CreateWatchlistSection;
use App\Actions\WatchlistSection\DeleteWatchlistSection;
use App\Actions\WatchlistSection\UpdateWatchlistSection;
use App\Http\Requests\WatchlistSection\DeleteWatchlistSectionRequest;
use App\Http\Requests\WatchlistSection\StoreWatchlistSectionRequest;
use App\Http\Requests\WatchlistSection\UpdateWatchlistSectionRequest;
use App\Models\Watchlist;
use App\Models\WatchlistSection;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class WatchlistSectionController extends Controller
{
    /**
     * Store a newly created watchlist section in storage.
     *
     * @param StoreWatchlistSectionRequest $request The validated request containing the watchlist section details.
     * @param Watchlist $watchlist The watchlist to which the section is to be added.
     * @param CreateWatchlistSection $action The action to create the watchlist section.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function store(
        StoreWatchlistSectionRequest $request,
        Watchlist $watchlist,
        CreateWatchlistSection $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('name'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_section.created')]);

        return back();
    }

    /**
     * Update the specified watchlist section in storage.
     *
     * @param UpdateWatchlistSectionRequest $request The validated request containing the updated watchlist section details.
     * @param WatchlistSection $section The watchlist section to be updated.
     * @param UpdateWatchlistSection $action The action to update the watchlist section.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
    public function update(
        UpdateWatchlistSectionRequest $request,
        WatchlistSection $section,
        UpdateWatchlistSection $action,
    ): RedirectResponse {
        $action->handle($section, $request->validated('name'));
        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist_section.renamed')]);

        return back();
    }

    /**
     * Remove the specified watchlist section from storage.
     *
     * @param DeleteWatchlistSectionRequest $request The validated request for deleting the watchlist section.
     * @param WatchlistSection $section The watchlist section to be deleted.
     * @param DeleteWatchlistSection $action The action to delete the watchlist section.
     *
     * @return RedirectResponse A redirect response back to the previous page with a success message.
     */
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
