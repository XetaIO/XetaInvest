<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Portfolio;
use App\Models\PortfolioSnapshot;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;

class PortfolioSnapshotRecorder
{
    public function __construct(
        protected FinanceQueryClient $client,
        protected PortfolioCalculator $calculator,
    ) {
    }

    /**
     * Records snapshots for all portfolios, optionally for a specific date and with a force option to bypass caching.
     *
     * @param CarbonInterface|null $date The date for which to record snapshots. Defaults to now if null.
     * @param bool $force Whether to force fetching fresh data, bypassing any cached data.
     *
     * @return array An associative array containing counts of captured, skipped, and failed snapshots.
     */
    public function recordAllPortfolios(?CarbonInterface $date = null, bool $force = false): array
    {
        $date = $date ? CarbonImmutable::instance($date) : CarbonImmutable::now();

        $captured = 0;
        $skipped = 0;
        $failed = 0;

        Portfolio::query()
            ->with(['positions.instrument', 'positions.transactions'])
            ->lazyById()
            ->each(function (Portfolio $portfolio) use ($date, $force, &$captured, &$skipped, &$failed): void {
                try {
                    $snapshot = $this->recordPortfolio($portfolio, $date, $force);

                    if ($snapshot === null) {
                        $skipped++;
                    } else {
                        $captured++;
                    }
                } catch (\Throwable $e) {
                    $failed++;
                    Log::error('PortfolioSnapshotRecorder failure', [
                        'portfolio_id' => $portfolio->id,
                        'date' => $date->toDateString(),
                        'error' => $e->getMessage(),
                    ]);
                }
            });

        return ['captured' => $captured, 'skipped' => $skipped, 'failed' => $failed];
    }

    /**
     * Record a snapshot for a specific portfolio on a given date.
     *
     * @param Portfolio $portfolio The portfolio for which to record a snapshot.
     * @param CarbonInterface $date The date for which to record the snapshot.
     * @param bool $force Whether to force fetching fresh data, bypassing any cached data.
     *
     * @return PortfolioSnapshot|null The recorded snapshot or null if recording failed.
     */
    public function recordPortfolio(Portfolio $portfolio, CarbonInterface $date, bool $force = false): ?PortfolioSnapshot
    {
        if (! $portfolio->relationLoaded('positions')) {
            $portfolio->load(['positions.instrument', 'positions.transactions']);
        }

        if ($portfolio->positions->isEmpty()) {
            return null;
        }

        $symbols = $portfolio->positions
            ->map(fn ($pos) => strtoupper($pos->instrument->symbol))
            ->unique()
            ->values()
            ->all();

        $currencies = $portfolio->positions
            ->map(fn ($pos) => strtoupper($pos->instrument->currency ?? 'USD'))
            ->unique()
            ->values()
            ->all();

        $quotes = $this->client->quotes($symbols, $force);
        $fxRates = ['EUR' => 1.0];

        foreach ($currencies as $currency) {
            if (! isset($fxRates[$currency])) {
                $fxRates[$currency] = $this->client->fxRate($currency, 'EUR');
            }
        }

        $computed = $this->calculator->computePortfolio($portfolio, $quotes, $fxRates);

        $positionCount = 0;
        foreach ($computed['positions'] as $row) {
            if (($row['quantity'] ?? 0.0) > 0.0) {
                $positionCount++;
            }
        }

        return PortfolioSnapshot::updateOrCreate(
            [
                'portfolio_id' => $portfolio->id,
                'captured_on' => $date->toDateString(),
            ],
            [
                'invested_eur' => $computed['total_invested_eur'],
                'current_value_eur' => $computed['current_value_eur'],
                'pnl_eur' => $computed['pnl_eur'],
                'position_count' => $positionCount,
                'quote_error' => false,
            ],
        );
    }
}
