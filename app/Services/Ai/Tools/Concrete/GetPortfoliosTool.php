<?php

declare(strict_types=1);

namespace App\Services\Ai\Tools\Concrete;

use App\Models\Portfolio;
use App\Models\User;
use App\Services\Ai\Tools\AiTool;
use App\Services\FinanceQueryClient;
use App\Services\PortfolioCalculator;
use Throwable;

class GetPortfoliosTool implements AiTool
{
    public function __construct(
        protected PortfolioCalculator $calculator,
        protected FinanceQueryClient $finance,
    ) {
    }

    public function name(): string
    {
        return 'get_portfolios';
    }

    public function description(): string
    {
        return "List the current user's portfolios with up-to-date KPIs (invested EUR, current value EUR, P&L EUR, P&L %, position count).";
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => new \stdClass,
            'required' => [],
        ];
    }

    public function execute(User $user, array $args): array
    {
        $portfolios = Portfolio::query()
            ->where('user_id', $user->id)
            ->with('positions.instrument')
            ->get();

        $items = [];

        /** @var Portfolio $portfolio */
        foreach ($portfolios as $portfolio) {
            $symbols = $portfolio->positions->pluck('instrument.symbol')->filter()->unique()->values()->all();

            $quotes = [];
            $fxRates = ['EUR' => 1.0];

            try {
                if ($symbols !== []) {
                    $quotes = $this->finance->quotes($symbols);

                    foreach ($portfolio->positions as $position) {
                        $cur = strtoupper((string) ($position->instrument->currency ?? 'EUR'));

                        if (! isset($fxRates[$cur])) {
                            $fxRates[$cur] = $this->finance->fxRate($cur, 'EUR');
                        }
                    }
                }

                $kpis = $this->calculator->computePortfolio($portfolio, $quotes, $fxRates);
            } catch (Throwable) {
                $kpis = null;
            }

            $items[] = [
                'id' => $portfolio->id,
                'name' => $portfolio->name,
                'is_default' => (bool) $portfolio->is_default,
                'position_count' => $portfolio->positions->count(),
                'kpis' => $kpis ? [
                    'invested_eur' => (float) ($kpis['invested_eur'] ?? 0),
                    'current_value_eur' => (float) ($kpis['current_value_eur'] ?? 0),
                    'pnl_eur' => (float) ($kpis['pnl_eur'] ?? 0),
                    'pnl_pct' => (float) ($kpis['pnl_pct'] ?? 0),
                ] : null,
            ];
        }

        return ['portfolios' => $items];
    }
}
