<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\AiReport;
use App\Models\User;

class AiReportPolicy
{
    public function view(User $user, AiReport $report): bool
    {
        return $report->user_id === $user->id;
    }

    public function delete(User $user, AiReport $report): bool
    {
        return $report->user_id === $user->id;
    }
}
