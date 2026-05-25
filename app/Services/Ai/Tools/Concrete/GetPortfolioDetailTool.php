<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\Portfolio;
use App\Models\User;
use App\Services\Ai\Tools\AiTool;

class GetPortfolioDetailTool implements AiTool
{
    public function name(): string
    {
        return 'get_portfolio_detail';
    }

    public function description(): string
    {
        return 'Get the detail of a portfolio owned by the current user: positions (symbol, name, exchange, currency), transactions and recent snapshots (last 30 days).';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'portfolio_id' => [
                    'type' => 'integer',
                    'description' => 'ID of the portfolio (must belong to the current user).',
                ],
            ],
            'required' => ['portfolio_id'],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $portfolio = Portfolio::query()
            ->where('user_id', $user->id)
            ->where('id', (int) ($args['portfolio_id'] ?? 0))
            ->with(['positions.instrument', 'positions.transactions'])
            ->first();

        if ($portfolio === null) {
            return ['error' => 'portfolio_not_found'];
        }

        $snapshots = $portfolio->snapshots()
            ->orderByDesc('captured_on')
            ->limit(30)
            ->get();

        return [
            'portfolio' => [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'is_default' => (bool) $portfolio->is_default,
            ],
            'positions' => $portfolio->positions->map(static fn ($p): array => [
                'id' => $p->id,
                'instrument' => [
                    'symbol' => $p->instrument->symbol ?? null,
                    'name' => $p->instrument->name ?? null,
                    'exchange' => $p->instrument->exchange ?? null,
                    'currency' => $p->instrument->currency ?? null,
                    'type' => $p->instrument->type ?? null,
                ],
                'transactions' => $p->transactions->map(static fn ($t): array => [
                    'type' => $t->type,
                    'quantity' => (float) $t->quantity,
                    'unit_price' => (float) $t->unit_price,
                    'executed_at' => $t->executed_at?->toIso8601String(),
                ])->all(),
            ])->all(),
            'snapshots' => $snapshots->map(static fn ($s): array => [
                'date' => $s->captured_on->toDateString(),
                'invested_eur' => (float) $s->invested_eur,
                'current_value_eur' => (float) $s->current_value_eur,
                'pnl_eur' => (float) $s->pnl_eur,
                'position_count' => (int) $s->position_count,
            ])->all(),
        ];
    }
}
