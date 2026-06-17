<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Watchlist\CreateWatchlist;
use App\Actions\Watchlist\DeleteWatchlist;
use App\Actions\Watchlist\UpdateWatchlist;
use App\Actions\Watchlist\ReorderWatchlist;
use App\Http\Requests\Watchlist\DeleteWatchlistRequest;
use App\Http\Requests\Watchlist\ReorderWatchlistRequest;
use App\Http\Requests\Watchlist\StoreWatchlistRequest;
use App\Http\Requests\Watchlist\UpdateWatchlistRequest;
use App\Models\Watchlist;
use App\Services\BuildWatchlistPageData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WatchlistController extends Controller
{
    /**
     * Display a listing of the user's watchlists.
     *
     * @param Request $request The incoming HTTP request.
     * @param BuildWatchlistPageData $builder Service to build the data for the watchlist page.
     *
     * @return Response The Inertia response containing the watchlist page data.
     */
    public function index(Request $request, BuildWatchlistPageData $builder): Response
    {
        return Inertia::render(
            'watchlist',
            $builder->build($request->user(), (string) $request->query('watchlist', '')),
        );
    }

    /**
     * Store a newly created watchlist in storage.
     *
     * @param StoreWatchlistRequest $request The validated request containing the watchlist name.
     * @param CreateWatchlist $action The action to create a new watchlist.
     *
     * @return RedirectResponse A redirect response to the watchlists index page with a success message.
     */
    public function store(StoreWatchlistRequest $request, CreateWatchlist $action): RedirectResponse
    {
        $watchlist = $action->handle($request->user(), $request->validated('name'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.created')]);

        return redirect()->route('watchlists.index', ['watchlist' => $watchlist->id]);
    }

    /**
     * Update the specified watchlist's name.
     *
     * @param UpdateWatchlistRequest $request The validated request containing the new watchlist name.
     * @param Watchlist $watchlist The watchlist to be updated.
     * @param UpdateWatchlist $action The action to update the watchlist.
     *
     * @return RedirectResponse A redirect response to the previous page with a success message.
     */
    public function update(
        UpdateWatchlistRequest $request,
        Watchlist $watchlist,
        UpdateWatchlist $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('name'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.renamed')]);

        return back();
    }

    /**
     * Remove the specified watchlist from storage.
     *
     * @param Request $request The incoming HTTP request.
     * @param Watchlist $watchlist The watchlist to be deleted.
     * @param DeleteWatchlist $action The action to delete the watchlist.
     *
     * @return RedirectResponse A redirect response to the watchlists index page with a success message.
     */
    public function destroy(
        DeleteWatchlistRequest $request,
        Watchlist $watchlist,
        DeleteWatchlist $action,
    ): RedirectResponse {
        $action->handle($watchlist);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.deleted')]);

        return redirect()->route('watchlists.index');
    }

    /**
     * Reorder the sections of the specified watchlist.
     *
     * @param ReorderWatchlistRequest $request The validated request containing the new order of sections.
     * @param Watchlist $watchlist The watchlist whose sections are to be reordered.
     * @param ReorderWatchlist $action The action to reorder the watchlist sections.
     *
     * @return RedirectResponse A redirect response to the previous page after reordering.
     */
    public function reorder(
        ReorderWatchlistRequest $request,
        Watchlist $watchlist,
        ReorderWatchlist $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('sections'));

        return back();
    }
}
