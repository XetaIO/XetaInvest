<?php

declare(strict_types=1);

namespace App\Console\Commands\Ai;

use App\Models\User;
use App\Services\Ai\Reports\NewsScreenerReportGenerator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

#[Signature('ai:generate-news-screener-report {--user= : Limit to a single user ID}')]
#[Description('Generate the daily AI news screener report (FR + US high-growth stocks). One report per user.')]
class GenerateNewsScreenerReportCommand extends Command
{
    public function handle(NewsScreenerReportGenerator $generator): int
    {
        $query = User::query();

        if ($this->option('user')) {
            $query->whereKey((int) $this->option('user'));
        }

        $failed = 0;
        $total = 0;

        foreach ($query->lazyById() as $user) {
            /** @var User $user */
            $this->components->task("News screener report user #{$user->id}", function () use ($generator, $user, &$failed): bool {
                try {
                    $report = $generator->generate($user);

                    $successful = $report->status->value === 'success';

                    if (! $successful) {
                        $failed++;
                    }

                    return $successful;
                } catch (Throwable $e) {
                    $this->components->error($e->getMessage());
                    $failed++;

                    return false;
                }
            });
            $total++;
        }

        $this->components->info(sprintf('Done. %d processed, %d failed.', $total, $failed));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
