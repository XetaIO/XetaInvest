<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

class BuildStatisticsPageData
{
    public function __construct(
        private readonly PortfolioSelector $selector,
        private readonly PortfolioStatistics $statistics,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, Request $request): array
    {
        $portfolios = $this->selector->listFor($user);
        $param = (string) $request->query('portfolio', 'all');
        ['portfolio' => $portfolio, 'scope' => $scope] = $this->selector->resolveForStatistics($user, $param);

        return [
            'portfolios' => $portfolios,
            'scope' => $scope,
            'stats' => $this->statistics->compute($user, $portfolio, $request->boolean('refresh')),
        ];
    }
}
