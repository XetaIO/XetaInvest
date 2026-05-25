<?php

declare(strict_types=1);

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Reports\NewsScreenerReportGenerator;
use Illuminate\Console\Command;
use Throwable;

class GenerateNewsScreenerReportCommand extends Command
{
    protected $signature = 'ai:generate-news-screener-report {--user= : Limit to a single user ID}';

    protected $description = 'Generate the daily AI news screener report (FR + US high-growth stocks). One report per user.';

    public function handle(NewsScreenerReportGenerator $generator): int
    {
        $query = User::query();

        if ($this->option('user')) {
            $query->whereKey((int) $this->option('user'));
        }

        $failed = 0;
        $total = 0;

        foreach ($query->get() as $user) {
            /** @var User $user */
            $this->components->task("News screener report user #{$user->id}", function () use ($generator, $user, &$failed): bool {
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
