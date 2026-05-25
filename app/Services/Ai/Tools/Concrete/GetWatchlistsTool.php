<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\User;
use App\Models\Watchlist;
use App\Services\Ai\Tools\AiTool;
use App\Services\FinanceQueryClient;
use Throwable;

class GetWatchlistsTool implements AiTool
{
    public function __construct(protected FinanceQueryClient $finance)
    {
    }

    public function name(): string
    {
        return 'get_watchlists';
    }

    public function description(): string
    {
        return "List the current user's watchlists with their items and last known quotes.";
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'with_quotes' => [
                    'type' => 'boolean',
                    'description' => 'Whether to fetch live quotes (default true).',
                ],
            ],
            'required' => [],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $withQuotes = (bool) ($args['with_quotes'] ?? true);

        $watchlists = Watchlist::query()
            ->where('user_id', $user->id)
            ->with('items.instrument')
            ->orderBy('position')
            ->get();

        $symbols = $watchlists
            ->flatMap(fn (Watchlist $w) => $w->items->pluck('instrument.symbol'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $quotes = [];

        if ($withQuotes && $symbols !== []) {
            try {
                $quotes = $this->finance->quotes($symbols);
            } catch (Throwable) {
                $quotes = [];
            }
        }

        return [
            'watchlists' => $watchlists->map(static function (Watchlist $w) use ($quotes): array {
                return [
                    'id' => $w->id,
                    'name' => $w->name,
                    'items' => $w->items->map(static function ($i) use ($quotes): array {
                        $symbol = strtoupper((string) ($i->instrument->symbol ?? ''));
                        $q = $quotes[$symbol] ?? null;

                        return [
                            'symbol' => $symbol,
                            'name' => $i->instrument->name ?? null,
                            'exchange' => $i->instrument->exchange ?? null,
                            'currency' => $i->instrument->currency ?? null,
                            'price' => $q['regularMarketPrice'] ?? null,
                            'change_percent' => $q['regularMarketChangePercent'] ?? null,
                        ];
                    })->all(),
                ];
            })->all(),
        ];
    }
}
