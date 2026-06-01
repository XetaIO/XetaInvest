<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Watchlist\ReorderWatchlistRequest;
use App\Http\Requests\Watchlist\StoreWatchlistRequest;
use App\Http\Requests\Watchlist\UpdateWatchlistRequest;
use App\Models\AiReport;
use App\Models\Watchlist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WatchlistController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $watchlists = $user->watchlists()
            ->with(['items.instrument'])
            ->get()
            ->map(fn (Watchlist $w) => [
                'id' => $w->id,
                'name' => $w->name,
                'position' => $w->position,
                'items' => $w->items->map(fn ($i) => [
                    'id' => $i->id,
                    'position' => $i->position,
                    'instrument' => [
                        'id' => $i->instrument->id,
                        'symbol' => $i->instrument->symbol,
                        'name' => $i->instrument->name,
                        'exchange' => $i->instrument->exchange,
                        'type' => $i->instrument->type,
                        'currency' => $i->instrument->currency,
                    ],
                ])->values(),
            ])->values();

        $activeId = (string) $request->query('watchlist', '');
        $active = $watchlists->firstWhere('id', $activeId) ?? $watchlists->first();

        return Inertia::render('watchlist', [
            'watchlists' => $watchlists,
            'activeWatchlistId' => $active['id'] ?? null,
            'aiWatchlistReport' => AiReport::query()
                ->where('user_id', $user->id)
                ->where('type', 'watchlist')
                ->whereDate('generated_for_date', today())
                ->latest()
                ->first(),
            'limits' => [
                'maxPerUser' => Watchlist::MAX_PER_USER,
                'maxItems' => Watchlist::MAX_ITEMS,
            ],
        ]);
    }

    public function store(StoreWatchlistRequest $request): RedirectResponse
    {
        $position = (int) $request->user()->watchlists()->max('position') + 1;

        $watchlist = $request->user()->watchlists()->create([
            'name' => $request->validated('name'),
            'position' => $position,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.created')]);

        return redirect()->route('watchlists.index', ['watchlist' => $watchlist->id]);
    }

    public function update(UpdateWatchlistRequest $request, Watchlist $watchlist): RedirectResponse
    {
        $watchlist->update(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.renamed')]);

        return back();
    }

    public function destroy(Request $request, Watchlist $watchlist): RedirectResponse
    {
        $this->authorize('delete', $watchlist);

        $watchlist->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('messages.watchlist.deleted')]);

        return redirect()->route('watchlists.index');
    }

    public function reorder(ReorderWatchlistRequest $request, Watchlist $watchlist): RedirectResponse
    {
        $ids = $request->validated('item_ids');

        DB::transaction(function () use ($watchlist, $ids): void {
            foreach ($ids as $index => $id) {
                $watchlist->items()->whereKey($id)->update(['position' => $index]);
            }
        });

        return back();
    }
}
