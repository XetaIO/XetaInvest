<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\FinanceQueryException;
use App\Models\Portfolio;
use App\Models\PortfolioSnapshot;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PortfolioStatistics
{
    public const CACHE_TTL = 1800;

    public const HISTORY_DAYS = 365;

    public function __construct(
        protected FinanceQueryClient $client,
        protected PortfolioCalculator $calculator,
    ) {
    }

    /**
     * Computes and retrieves portfolio statistics for a given user, optionally for a specific portfolio. The results are cached for performance, with an option to force refresh the data.
     *
     * @param User $user The user for whom to compute statistics.
     * @param Portfolio|null $portfolio Optional specific portfolio to compute statistics for. If null, computes for all portfolios.
     * @param bool $forceRefresh Whether to force refresh the cached data.
     *
     * @return array An associative array containing computed statistics and related data.
     */
    public function compute(User $user, ?Portfolio $portfolio = null, bool $forceRefresh = false): array
    {
        $cacheKey = sprintf('stats:v2:user:%d:%s', $user->id, $portfolio?->id ?? 'all');

        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, self::CACHE_TTL, fn (): array => $this->build($user, $portfolio, $forceRefresh));
    }

    /**
     * Builds the portfolio statistics for a given user and portfolio.
     *
     * @param User $user The user for whom to build statistics.
     * @param Portfolio|null $portfolio The specific portfolio to build statistics for.
     * @param bool $forceRefresh Whether to force refresh the cached data.
     *
     * @return array<string, mixed> The computed statistics and related data.
     */
    protected function build(User $user, ?Portfolio $portfolio, bool $forceRefresh = false): array
    {
        $query = $user->portfolios()->with(['positions.instrument', 'positions.transactions']);

        if ($portfolio) {
            $query->whereKey($portfolio->id);
        }

        $portfolios = $query->get();

        $symbols = $portfolios
            ->flatMap(fn ($p) => $p->positions->map(fn ($pos) => strtoupper($pos->instrument->symbol)))
            ->unique()
            ->values()
            ->all();

        $quotes = [];
        $fxRates = ['EUR' => 1.0];
        $error = null;

        if (! empty($symbols)) {
            try {
                $quotes = $this->client->quotes($symbols, $forceRefresh);

                $currencies = $portfolios
                    ->flatMap(fn ($p) => $p->positions->map(fn ($pos) => strtoupper($pos->instrument->currency ?? 'USD')))
                    ->unique();

                foreach ($currencies as $cur) {
                    if (! isset($fxRates[$cur])) {
                        $fxRates[$cur] = $this->client->fxRate($cur, 'EUR');
                    }
                }
            } catch (FinanceQueryException $e) {
                $error = $e->getMessage();
            }
        }

        $totalInvested = 0.0;
        $totalCurrent = 0.0;
        $totalPrevious = 0.0;
        $positionCount = 0;

        $byInstrument = [];
        $byCurrency = [];
        $byType = [];
        $byPortfolio = [];

        foreach ($portfolios as $p) {
            $portfolioValue = 0.0;

            foreach ($p->positions as $position) {
                $symbol = strtoupper($position->instrument->symbol);
                $quote = $quotes[$symbol] ?? null;
                $currency = strtoupper($position->instrument->currency ?? 'USD');
                $fxRate = $fxRates[$currency] ?? 1.0;
                $type = strtolower($position->instrument->type ?? 'stock');

                $computed = $this->calculator->computePosition($position, $quote, $fxRate);

                if ($computed['quantity'] <= 0.0) {
                    continue;
                }

                $positionCount++;
                $totalInvested += $computed['invested_eur'];
                $totalCurrent += $computed['current_value_eur'];
                $totalPrevious += $computed['quantity'] * $computed['previous_close'] * $computed['fx_rate'];
                $portfolioValue += $computed['current_value_eur'];

                $key = $symbol;

                if (! isset($byInstrument[$key])) {
                    $byInstrument[$key] = [
                        'symbol' => $position->instrument->symbol,
                        'name' => $position->instrument->name,
                        'currency' => $currency,
                        'type' => $type,
                        'value_eur' => 0.0,
                        'invested_eur' => 0.0,
                        'pnl_eur' => 0.0,
                    ];
                }

                $byInstrument[$key]['value_eur'] += $computed['current_value_eur'];
                $byInstrument[$key]['invested_eur'] += $computed['invested_eur'];
                $byInstrument[$key]['pnl_eur'] += $computed['pnl_eur'];

                $byCurrency[$currency] = ($byCurrency[$currency] ?? 0.0) + $computed['current_value_eur'];
                $byType[$type] = ($byType[$type] ?? 0.0) + $computed['current_value_eur'];
            }

            $byPortfolio[] = [
                'portfolio_id' => $p->id,
                'name' => $p->name,
                'value_eur' => $portfolioValue,
                'percent' => 0.0,
            ];
        }

        $denom = $totalCurrent > 0.0 ? $totalCurrent : 1.0;

        $allocInstrument = array_values(array_map(function (array $row) use ($denom): array {
            $row['percent'] = $row['value_eur'] / $denom * 100.0;
            $row['pnl_pct'] = $row['invested_eur'] > 0.0
                ? $row['pnl_eur'] / $row['invested_eur'] * 100.0
                : 0.0;

            return $row;
        }, $byInstrument));

        usort($allocInstrument, fn ($a, $b) => $b['value_eur'] <=> $a['value_eur']);

        $allocCurrency = [];
        foreach ($byCurrency as $cur => $val) {
            $allocCurrency[] = [
                'currency' => $cur,
                'value_eur' => $val,
                'percent' => $val / $denom * 100.0,
            ];
        }
        usort($allocCurrency, fn ($a, $b) => $b['value_eur'] <=> $a['value_eur']);

        $allocType = [];
        foreach ($byType as $t => $val) {
            $allocType[] = [
                'type' => $t,
                'value_eur' => $val,
                'percent' => $val / $denom * 100.0,
            ];
        }
        usort($allocType, fn ($a, $b) => $b['value_eur'] <=> $a['value_eur']);

        foreach ($byPortfolio as &$row) {
            $row['percent'] = $row['value_eur'] / $denom * 100.0;
        }
        unset($row);
        usort($byPortfolio, fn ($a, $b) => $b['value_eur'] <=> $a['value_eur']);

        $sortedByPct = $allocInstrument;
        usort($sortedByPct, fn ($a, $b) => $b['pnl_pct'] <=> $a['pnl_pct']);
        $topGainers = array_values(array_filter(array_slice($sortedByPct, 0, 5), fn ($r) => $r['pnl_pct'] > 0.0));

        $losers = $allocInstrument;
        usort($losers, fn ($a, $b) => $a['pnl_pct'] <=> $b['pnl_pct']);
        $topLosers = array_values(array_filter(array_slice($losers, 0, 5), fn ($r) => $r['pnl_pct'] < 0.0));

        $pnlEur = $totalCurrent - $totalInvested;
        $dailyEur = $totalCurrent - $totalPrevious;
        $history = $this->withCurrentHistoryPoint(
            $this->buildHistory($user, $portfolio),
            $totalCurrent,
            $totalInvested,
            $pnlEur,
        );

        return [
            'scope' => $portfolio
                ? ['type' => 'portfolio', 'id' => $portfolio->id, 'name' => $portfolio->name]
                : ['type' => 'all'],
            'totals' => [
                'invested_eur' => $totalInvested,
                'current_value_eur' => $totalCurrent,
                'pnl_eur' => $pnlEur,
                'pnl_pct' => $totalInvested > 0.0 ? $pnlEur / $totalInvested * 100.0 : 0.0,
                'daily_change_eur' => $dailyEur,
                'daily_change_pct' => $totalPrevious > 0.0 ? $dailyEur / $totalPrevious * 100.0 : 0.0,
                'position_count' => $positionCount,
                'instrument_count' => count($allocInstrument),
                'portfolio_count' => $portfolios->count(),
            ],
            'allocations' => [
                'by_instrument' => $allocInstrument,
                'by_currency' => $allocCurrency,
                'by_type' => $allocType,
                'by_portfolio' => $portfolio ? [] : $byPortfolio,
            ],
            'performance' => [
                'top_gainers' => $topGainers,
                'top_losers' => $topLosers,
            ],
            'generated_at' => now()->toIso8601String(),
            'quote_error' => $error,
            'history' => $history,
        ];
    }

    /**
     * Builds the historical portfolio data for a given user and portfolio, limited to the last HISTORY_DAYS days.
     *
     * @param User $user The user for whom to build history.
     * @param Portfolio|null $portfolio The specific portfolio to build history for. If null, builds history for all portfolios.
     *
     * @return array<int, array{date: string, value_eur: float, invested_eur: float, pnl_eur: float}> An array of historical data points.
     */
    protected function buildHistory(User $user, ?Portfolio $portfolio): array
    {
        $since = now()->subDays(self::HISTORY_DAYS)->toDateString();

        if ($portfolio) {
            $rows = PortfolioSnapshot::query()
                ->where('portfolio_id', $portfolio->id)
                ->where('captured_on', '>=', $since)
                ->orderBy('captured_on')
                ->get(['captured_on', 'invested_eur', 'current_value_eur', 'pnl_eur']);

            return $rows->map(fn ($r) => [
                'date' => $r->captured_on->toDateString(),
                'value_eur' => (float) $r->current_value_eur,
                'invested_eur' => (float) $r->invested_eur,
                'pnl_eur' => (float) $r->pnl_eur,
            ])->all();
        }

        $portfolioIds = $user->portfolios()->pluck('id');

        if ($portfolioIds->isEmpty()) {
            return [];
        }

        $rows = PortfolioSnapshot::query()
            ->whereIn('portfolio_id', $portfolioIds)
            ->where('captured_on', '>=', $since)
            ->groupBy('captured_on')
            ->orderBy('captured_on')
            ->get([
                'captured_on',
                DB::raw('SUM(invested_eur) AS invested_eur'),
                DB::raw('SUM(current_value_eur) AS current_value_eur'),
                DB::raw('SUM(pnl_eur) AS pnl_eur'),
            ]);

        return $rows->map(fn ($r) => [
            'date' => (string) (is_string($r->captured_on) ? $r->captured_on : $r->captured_on->toDateString()),
            'value_eur' => (float) $r->current_value_eur,
            'invested_eur' => (float) $r->invested_eur,
            'pnl_eur' => (float) $r->pnl_eur,
        ])->all();
    }

    /**
     * Adds the current day's portfolio data to the historical data, ensuring that the history includes today's values.
     *
     * @param array<int, array{date: string, value_eur: float, invested_eur: float, pnl_eur: float}> $history The existing historical data.
     * @param float $currentValue The current total value of the portfolio(s) in EUR.
     * @param float $invested The total invested amount in EUR.
     * @param float $pnl The total profit and loss in EUR.
     *
     * @return array<int, array{date: string, value_eur: float, invested_eur: float, pnl_eur: float}> The updated historical data including today's values.
     */
    private function withCurrentHistoryPoint(
        array $history,
        float $currentValue,
        float $invested,
        float $pnl,
    ): array {
        $today = today()->toDateString();
        $history = array_values(array_filter(
            $history,
            fn (array $point): bool => $point['date'] !== $today,
        ));
        $history[] = [
            'date' => $today,
            'value_eur' => $currentValue,
            'invested_eur' => $invested,
            'pnl_eur' => $pnl,
        ];

        usort($history, fn (array $a, array $b): int => $a['date'] <=> $b['date']);

        return $history;
    }
}
