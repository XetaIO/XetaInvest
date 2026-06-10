<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Exceptions\FinanceQueryException;
use App\Models\Portfolio;
use App\Services\PortfolioSnapshotRecorder;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('portfolio:snapshot {--date= : ISO date (YYYY-MM-DD), defaults to today} {--portfolio= : Portfolio ID, omit for all portfolios} {--force : Force fresh quotes from provider}')]
#[Description('Capture daily portfolio value snapshots for the historical chart.')]
class CapturePortfolioSnapshots extends Command
{
    public function handle(PortfolioSnapshotRecorder $recorder): int
    {
        $dateOption = $this->option('date');
        try {
            $date = $dateOption ? CarbonImmutable::parse((string) $dateOption) : CarbonImmutable::now();
        } catch (\Throwable $e) {
            $this->error("Invalid --date value: {$dateOption}");

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $portfolioId = $this->option('portfolio');

        if ($portfolioId !== null) {
            $portfolio = Portfolio::find((int) $portfolioId);

            if ($portfolio === null) {
                $this->error("Portfolio #{$portfolioId} not found.");

                return self::FAILURE;
            }

            try {
                $snapshot = $recorder->recordPortfolio($portfolio, $date, $force);
            } catch (FinanceQueryException $exception) {
                $this->error(sprintf(
                    'Snapshot not saved for portfolio #%d: market data is unavailable.',
                    $portfolio->id,
                ));

                report($exception);

                return self::FAILURE;
            }

            if ($snapshot === null) {
                $this->warn("Portfolio #{$portfolio->id} has no positions, skipped.");

                return self::SUCCESS;
            }

            $this->info(sprintf(
                'Snapshot saved for portfolio #%d on %s (value: %.2f EUR).',
                $portfolio->id,
                $date->toDateString(),
                (float) $snapshot->current_value_eur,
            ));

            return self::SUCCESS;
        }

        $result = $recorder->recordAllPortfolios($date, $force);

        $this->table(
            ['Date', 'Captured', 'Skipped (empty)', 'Failed'],
            [[$date->toDateString(), $result['captured'], $result['skipped'], $result['failed']]],
        );

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
