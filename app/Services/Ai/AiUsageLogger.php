<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\AiUsage;
use App\Models\User;
use App\Services\Ai\DataTransferObjects\AiQuotaReservation;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Exceptions\AiQuotaExceededException;
use Illuminate\Support\Facades\DB;

class AiUsageLogger
{
    /**
     * Throws if the daily token quota for the user or globally is exceeded.
     */
    public function ensureWithinQuota(?User $user): void
    {
        $reservation = $this->reserve($user, 0);
        $this->release($reservation);
    }

    public function reserve(?User $user, int $tokens): AiQuotaReservation
    {
        $date = now()->toDateString();
        $limits = $this->quotaLimits($user);
        $scopeKeys = array_keys($limits);

        if ($scopeKeys === []) {
            return new AiQuotaReservation($date, [], $tokens);
        }

        $now = now();
        $rows = array_map(static fn (string $scopeKey): array => [
            'quota_date' => $date,
            'scope_key' => $scopeKey,
            'consumed_tokens' => 0,
            'reserved_tokens' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ], $scopeKeys);

        DB::table('ai_daily_quotas')->upsert(
            $rows,
            ['quota_date', 'scope_key'],
            ['updated_at'],
        );

        DB::transaction(function () use ($date, $limits, $tokens): void {
            $quotas = DB::table('ai_daily_quotas')
                ->where('quota_date', $date)
                ->whereIn('scope_key', array_keys($limits))
                ->orderBy('scope_key')
                ->lockForUpdate()
                ->get()
                ->keyBy('scope_key');

            foreach ($limits as $scopeKey => $limit) {
                $quota = $quotas->get($scopeKey);
                $allocated = (int) $quota->consumed_tokens + (int) $quota->reserved_tokens;

                if ($allocated + $tokens > $limit) {
                    throw new AiQuotaExceededException(sprintf(
                        'Daily token quota reached for %s (%d / %d).',
                        $scopeKey,
                        $allocated,
                        $limit,
                    ));
                }
            }

            DB::table('ai_daily_quotas')
                ->where('quota_date', $date)
                ->whereIn('scope_key', array_keys($limits))
                ->increment('reserved_tokens', $tokens);
        });

        return new AiQuotaReservation($date, $scopeKeys, $tokens);
    }

    /**
     * Persist a usage record and return the estimated cost.
     */
    public function record(
        ?User $user,
        string $purpose,
        AiResponse $response,
        ?AiQuotaReservation $reservation = null,
    ): float {
        $cost = $this->estimateCost($response);
        $consumedTokens = $response->promptTokens + $response->completionTokens;

        DB::transaction(function () use ($user, $purpose, $response, $reservation, $cost, $consumedTokens): void {
            AiUsage::query()->create([
                'user_id' => $user?->id,
                'provider' => $response->provider,
                'model' => $response->model,
                'purpose' => $purpose,
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
                'cost_estimate' => $cost,
            ]);

            if ($reservation !== null && $reservation->scopeKeys !== []) {
                DB::table('ai_daily_quotas')
                    ->where('quota_date', $reservation->date)
                    ->whereIn('scope_key', $reservation->scopeKeys)
                    ->decrement('reserved_tokens', $reservation->tokens);

                DB::table('ai_daily_quotas')
                    ->where('quota_date', $reservation->date)
                    ->whereIn('scope_key', $reservation->scopeKeys)
                    ->increment('consumed_tokens', $consumedTokens);
            }
        });

        return $cost;
    }

    public function release(AiQuotaReservation $reservation): void
    {
        if ($reservation->scopeKeys === [] || $reservation->tokens === 0) {
            return;
        }

        DB::table('ai_daily_quotas')
            ->where('quota_date', $reservation->date)
            ->whereIn('scope_key', $reservation->scopeKeys)
            ->decrement('reserved_tokens', $reservation->tokens);
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

    /** @return array<string, int> */
    private function quotaLimits(?User $user): array
    {
        $limits = [];
        $global = (int) config('ai.quotas.daily_tokens_global', 0);
        $perUser = (int) config('ai.quotas.daily_tokens_per_user', 0);

        if ($global > 0) {
            $limits['global'] = $global;
        }

        if ($perUser > 0 && $user !== null) {
            $limits['user:'.$user->id] = $perUser;
        }

        return $limits;
    }
}
