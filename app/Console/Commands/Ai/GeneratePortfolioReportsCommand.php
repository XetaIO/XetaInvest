<?php

declare(strict_types=1);

namespace App\Console\Commands\Ai;

use App\Models\Portfolio;
use App\Models\User;
use App\Services\Ai\Exceptions\AiQuotaExceededException;
use App\Services\Ai\Reports\PortfolioReportGenerator;
use Illuminate\Console\Command;
use Throwable;

class GeneratePortfolioReportsCommand extends Command
{
    protected $signature = 'ai:generate-portfolio-reports
        {--user= : Limit to a single user ID}
        {--portfolio= : Limit to a single portfolio ID}';

    protected $description = 'Generate daily AI reports for every portfolio (per user).';

    public function handle(PortfolioReportGenerator $generator): int
    {
        $userId = $this->option('user');
        $portfolioId = $this->option('portfolio');

        $query = User::query();

        if ($userId) {
            $query->whereKey((int) $userId);
        }

        $users = $query->get();

        $total = 0;
        $failed = 0;

        /** @var User $user */
        foreach ($users as $user) {
            $portfolios = Portfolio::query()->where('user_id', $user->id);

            if ($portfolioId) {
                $portfolios->whereKey((int) $portfolioId);
            }

            foreach ($portfolios->get() as $portfolio) {
                $this->components->task(
                    sprintf('Portfolio #%d (%s) for user #%d', $portfolio->id, $portfolio->name, $user->id),
                    function () use ($generator, $user, $portfolio, &$failed): bool {
                        try {
                            $report = $generator->generate($user, $portfolio);

                            return $report->status->value === 'success';
                        } catch (AiQuotaExceededException $e) {
                            $this->components->warn($e->getMessage());
                            $failed++;

                            return false;
                        } catch (Throwable $e) {
                            $this->components->error($e->getMessage());
                            $failed++;

                            return false;
                        }
                    },
                );

                $total++;
            }
        }

        $this->components->info(sprintf('Done. %d processed, %d failed.', $total, $failed));

        return self::SUCCESS;
    }
}
