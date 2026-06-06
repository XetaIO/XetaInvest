<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Watchlist\ReorderWatchlistRequest;
use App\Http\Requests\Watchlist\StoreWatchlistRequest;
use App\Http\Requests\Watchlist\UpdateWatchlistRequest;
use App\Models\AiReport;
use App\Models\Position;
use App\Models\Watchlist;
use App\Services\PortfolioCalculator;
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

        $symbols = $watchlists
            ->pluck('items')
            ->flatten(1)
            ->pluck('instrument.symbol')
            ->filter()
            ->unique()
            ->values()
            ->all();

        return Inertia::render('watchlist', [
            'watchlists' => $watchlists,
            'activeWatchlistId' => $active['id'] ?? null,
            'positions' => $this->positionsBySymbol($user->id, $symbols),
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

    /**
     * Aggregate the user's open positions by instrument symbol, returning the
     * weighted average cost (PRU) per symbol across all of their portfolios.
     *
     * @param  array<int, string>  $symbols
     * @return array<string, array{avg_price: float, quantity: float, currency: string|null}>
     */
    private function positionsBySymbol(int $userId, array $symbols): array
    {
        if ($symbols === []) {
            return [];
        }

        $positions = Position::query()
            ->whereHas('portfolio', fn ($q) => $q->where('user_id', $userId))
            ->whereHas('instrument', fn ($q) => $q->whereIn('symbol', $symbols))
            ->with(['instrument', 'transactions'])
            ->get();

        $calculator = new PortfolioCalculator();

        /** @var array<string, array{invested: float, quantity: float, currency: string|null}> $aggregate */
        $aggregate = [];

        foreach ($positions as $position) {
            $kpis = $calculator->computePosition($position, [], 1.0);

            if ($kpis['quantity'] <= 0.0) {
                continue;
            }

            $symbol = strtoupper($position->instrument->symbol);

            if (! isset($aggregate[$symbol])) {
                $aggregate[$symbol] = [
                    'invested' => 0.0,
                    'quantity' => 0.0,
                    'currency' => $position->instrument->currency,
                ];
            }

            $aggregate[$symbol]['invested'] += $kpis['invested_native'];
            $aggregate[$symbol]['quantity'] += $kpis['quantity'];
        }

        return collect($aggregate)
            ->map(fn (array $row) => [
                'avg_price' => $row['quantity'] > 0.0 ? $row['invested'] / $row['quantity'] : 0.0,
                'quantity' => $row['quantity'],
                'currency' => $row['currency'],
            ])
            ->all();
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
