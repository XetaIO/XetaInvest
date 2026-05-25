<?php

declare(strict_types=1);

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Reports\WatchlistReportGenerator;
use Illuminate\Console\Command;
use Throwable;

class GenerateWatchlistReportsCommand extends Command
{
    protected $signature = 'ai:generate-watchlist-reports {--user= : Limit to a single user ID}';

    protected $description = 'Generate a daily AI watchlist report for each user.';

    public function handle(WatchlistReportGenerator $generator): int
    {
        $query = User::query()->whereHas('watchlists');

        if ($this->option('user')) {
            $query->whereKey((int) $this->option('user'));
        }

        $failed = 0;
        $total = 0;

        foreach ($query->get() as $user) {
            /** @var User $user */
            $this->components->task("Watchlist report user #{$user->id}", function () use ($generator, $user, &$failed): bool {
                try {
                    $report = $generator->generate($user);

                    return $report->status->value === 'success';
                } catch (Throwable $e) {
                    $this->components->error($e->getMessage());
                    $failed++;

                    return false;
                }
            });
            $total++;
        }

        $this->components->info(sprintf('Done. %d processed, %d failed.', $total, $failed));

        return self::SUCCESS;
    }
}
