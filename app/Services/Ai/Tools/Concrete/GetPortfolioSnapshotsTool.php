<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\Portfolio;
use App\Models\User;
use App\Services\Ai\Tools\AiTool;

class GetPortfolioSnapshotsTool implements AiTool
{
    public function name(): string
    {
        return 'get_portfolio_snapshots';
    }

    public function description(): string
    {
        return 'Get daily historical snapshots of a portfolio (invested_eur, current_value_eur, pnl_eur) for the last N days (default 30).';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'portfolio_id' => ['type' => 'integer'],
                'days' => ['type' => 'integer', 'description' => 'Number of days back (1-365, default 30).'],
            ],
            'required' => ['portfolio_id'],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $portfolio = Portfolio::query()
            ->where('user_id', $user->id)
            ->where('id', (int) ($args['portfolio_id'] ?? 0))
            ->first();

        if ($portfolio === null) {
            return ['error' => 'portfolio_not_found'];
        }

        $days = max(1, min(365, (int) ($args['days'] ?? 30)));

        $snapshots = $portfolio->snapshots()
            ->where('captured_on', '>=', now()->subDays($days)->toDateString())
            ->orderBy('captured_on')
            ->get();

        return [
            'portfolio_id' => $portfolio->id,
            'days' => $days,
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
