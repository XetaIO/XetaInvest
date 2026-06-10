<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Watchlist\CreateWatchlist;
use App\Actions\Watchlist\DeleteWatchlist;
use App\Actions\Watchlist\RenameWatchlist;
use App\Actions\Watchlist\ReorderWatchlistItems;
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
    public function index(Request $request, BuildWatchlistPageData $builder): Response
    {
        return Inertia::render(
            'watchlist',
            $builder->build($request->user(), (string) $request->query('watchlist', '')),
        );
    }

    public function store(StoreWatchlistRequest $request, CreateWatchlist $action): RedirectResponse
    {
        $watchlist = $action->handle($request->user(), $request->validated('name'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.created')]);

        return redirect()->route('watchlists.index', ['watchlist' => $watchlist->id]);
    }

    public function update(
        UpdateWatchlistRequest $request,
        Watchlist $watchlist,
        RenameWatchlist $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('name'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.renamed')]);

        return back();
    }

    public function destroy(
        Request $request,
        Watchlist $watchlist,
        DeleteWatchlist $action,
    ): RedirectResponse {
        $this->authorize('delete', $watchlist);
        $action->handle($watchlist);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.deleted')]);

        return redirect()->route('watchlists.index');
    }

    public function reorder(
        ReorderWatchlistRequest $request,
        Watchlist $watchlist,
        ReorderWatchlistItems $action,
    ): RedirectResponse {
        $action->handle($watchlist, $request->validated('item_ids'));

        return back();
    }
}
