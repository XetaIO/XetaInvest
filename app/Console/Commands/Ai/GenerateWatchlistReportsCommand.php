<?php

declare(strict_types=1);

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Reports\WatchlistReportGenerator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('ai:generate-watchlist-reports {--user= : Limit to a single user ID}')]
#[Description('Generate a daily AI watchlist report for each user.')]
class GenerateWatchlistReportsCommand extends Command
{
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
