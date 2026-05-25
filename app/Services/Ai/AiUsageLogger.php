<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\AiUsage;
use App\Models\User;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Exceptions\AiQuotaExceededException;

class AiUsageLogger
{
    /**
     * Throws if the daily token quota for the user or globally is exceeded.
     */
    public function ensureWithinQuota(?User $user): void
    {
        $perUser = (int) config('ai.quotas.daily_tokens_per_user', 0);
        $global = (int) config('ai.quotas.daily_tokens_global', 0);

        if ($perUser > 0 && $user !== null) {
            $consumed = (int) AiUsage::query()
                ->where('user_id', $user->id)
                ->whereDate('created_at', now()->toDateString())
                ->sum(\DB::raw('prompt_tokens + completion_tokens'));

            if ($consumed >= $perUser) {
                throw new AiQuotaExceededException(sprintf(
                    'Daily token quota reached for user (%d / %d).',
                    $consumed,
                    $perUser,
                ));
            }
        }

        if ($global > 0) {
            $consumed = (int) AiUsage::query()
                ->whereDate('created_at', now()->toDateString())
                ->sum(\DB::raw('prompt_tokens + completion_tokens'));

            if ($consumed >= $global) {
                throw new AiQuotaExceededException(sprintf(
                    'Global daily token quota reached (%d / %d).',
                    $consumed,
                    $global,
                ));
            }
        }
    }

    /**
     * Persist a usage record and return the estimated cost.
     */
    public function record(?User $user, string $purpose, AiResponse $response): float
    {
        $cost = $this->estimateCost($response);

        AiUsage::query()->create([
            'user_id' => $user?->id,
            'provider' => $response->provider,
            'model' => $response->model,
            'purpose' => $purpose,
            'prompt_tokens' => $response->promptTokens,
            'completion_tokens' => $response->completionTokens,
            'cost_estimate' => $cost,
        ]);

        return $cost;
    }

    public function estimateCost(AiResponse $response): float
    {
        $rates = config('ai.providers.'.$response->provider.'.cost_per_1k');

        if (! is_array($rates)) {
            return 0.0;
        }

        $prompt = ((float) ($rates['prompt'] ?? 0)) * $response->promptTokens / 1000;
        $completion = ((float) ($rates['completion'] ?? 0)) * $response->completionTokens / 1000;

        return round($prompt + $completion, 6);
    }
}
