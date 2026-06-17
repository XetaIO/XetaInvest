<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Portfolio;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class PortfolioSelector
{
    /**
     * @return Collection<int, Portfolio>
     */
    public function listFor(User $user): Collection
    {
        return $user->portfolios()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get(['id', 'name', 'is_default']);
    }

    /**
     * @param  Collection<int, Portfolio>  $portfolios
     */
    public function resolveForDashboard(Collection $portfolios, int $activeId): ?Portfolio
    {
        return $portfolios->firstWhere('id', $activeId)
            ?? $portfolios->firstWhere('is_default', true)
            ?? $portfolios->first();
    }

    /**
     * @return array{portfolio: ?Portfolio, scope: string}
     */
    public function resolveForStatistics(User $user, string $param): array
    {
        if ($param === 'all') {
            return ['portfolio' => null, 'scope' => 'all'];
        }

        if (! ctype_digit($param)) {
            abort(404);
        }

        $portfolio = $user->portfolios()->whereKey((int) $param)->first();

        if (! $portfolio) {
            abort(404);
        }

        return ['portfolio' => $portfolio, 'scope' => (string) $portfolio->id];
    }
}
