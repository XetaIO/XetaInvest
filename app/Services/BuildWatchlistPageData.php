<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AiReport;
use App\Models\Position;
use App\Models\User;
use App\Models\Watchlist;

class BuildWatchlistPageData
{
    public function __construct(private readonly PortfolioCalculator $calculator)
    {
    }

    /** @return array<string, mixed> */
    public function build(User $user, string $activeId): array
    {
        $watchlists = $user->watchlists()
            ->with(['sections.items.instrument'])
            ->get()
            ->map(fn (Watchlist $watchlist): array => [
                'id' => $watchlist->id,
                'name' => $watchlist->name,
                'position' => $watchlist->position,
                'sections' => $watchlist->sections->map(fn ($section): array => [
                    'id' => $section->id,
                    'name' => $section->name,
                    'position' => $section->position,
                    'is_default' => $section->is_default,
                    'items' => $section->items->map(fn ($item): array => [
                        'id' => $item->id,
                        'section_id' => $item->section_id,
                        'position' => $item->position,
                        'instrument' => [
                            'id' => $item->instrument->id,
                            'symbol' => $item->instrument->symbol,
                            'name' => $item->instrument->name,
                            'exchange' => $item->instrument->exchange,
                            'type' => $item->instrument->type,
                            'currency' => $item->instrument->currency,
                        ],
                    ])->values(),
                ])->values(),
            ])->values();

        $active = $watchlists->firstWhere('id', $activeId) ?? $watchlists->first();
        $symbols = $watchlists
            ->pluck('sections')
            ->flatten(1)
            ->pluck('items')
            ->flatten(1)
            ->pluck('instrument.symbol')
            ->filter()
            ->unique()
            ->values()
            ->all();

        return [
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
        ];
    }

    /**
     * @param  array<int, string>  $symbols
     * @return array<string, array{avg_price: float, quantity: float, currency: string|null}>
     */
    private function positionsBySymbol(int $userId, array $symbols): array
    {
        if ($symbols === []) {
            return [];
        }

        $positions = Position::query()
            ->whereHas('portfolio', fn ($query) => $query->where('user_id', $userId))
            ->whereHas('instrument', fn ($query) => $query->whereIn('symbol', $symbols))
            ->with(['instrument', 'transactions'])
            ->get();

        /** @var array<string, array{invested: float, quantity: float, currency: string|null}> $aggregate */
        $aggregate = [];

        foreach ($positions as $position) {
            $kpis = $this->calculator->computePosition($position, [], 1.0);

            if ($kpis['quantity'] <= 0.0) {
                continue;
            }

            $symbol = strtoupper($position->instrument->symbol);
            $aggregate[$symbol] ??= [
                'invested' => 0.0,
                'quantity' => 0.0,
                'currency' => $position->instrument->currency,
            ];
            $aggregate[$symbol]['invested'] += $kpis['invested_native'];
            $aggregate[$symbol]['quantity'] += $kpis['quantity'];
        }

        return collect($aggregate)
            ->map(fn (array $row): array => [
                'avg_price' => $row['quantity'] > 0.0 ? $row['invested'] / $row['quantity'] : 0.0,
                'quantity' => $row['quantity'],
                'currency' => $row['currency'],
            ])
            ->all();
    }
}
