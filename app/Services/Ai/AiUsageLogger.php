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
     * Ensure that the user is within their daily quota limits. If the user has exceeded their quota, an exception will be thrown.
     *
     * @param User|null $user The user for whom to check the quota. If null, only global quotas are checked.
     *
     * @throws AiQuotaExceededException If the user has exceeded their daily quota.
     */
    public function ensureWithinQuota(?User $user): void
    {
        $reservation = $this->reserve($user, 0);
        $this->release($reservation);
    }

    /**
     * Reserve a specified number of tokens for the user, ensuring that the reservation does not exceed the user's daily quota limits.
     *
     * @param User|null $user The user for whom to reserve tokens. If null, only global quotas are considered.
     * @param int $tokens The number of tokens to reserve.
     *
     * @return AiQuotaReservation An object representing the reserved quota.
     *
     * @throws AiQuotaExceededException If the reservation exceeds the user's daily quota limits.
     */
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
     * Record the usage of AI tokens for a specific user and purpose, along with the associated response and any reserved quota.
     *
     * @param User|null $user The user for whom the usage is being recorded. If null, only global usage is recorded.
     * @param string $purpose The purpose of the AI usage (e.g., 'chat', 'report').
     * @param AiResponse $response The response from the AI provider, containing token counts and other details.
     * @param AiQuotaReservation|null $reservation An optional reservation object representing previously reserved quota.
     *
     * @return float The estimated cost of the AI usage based on the response.
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

    /**
     * Release a previously reserved quota, making the tokens available for use again.
     *
     * @param AiQuotaReservation $reservation The reservation to release.
     *
     * @return void
     */
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

    /**
     * Estimate the cost of the AI usage based on the response's token counts and the configured rates for the provider.
     *
     * @param AiResponse $response The response from the AI provider, containing token counts and other details.
     *
     * @return float The estimated cost of the AI usage.
     */
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

    /**
     * Get the daily quota limits for the user and globally. This method retrieves the configured limits from the application settings.
     *
     * @param User|null $user The user for whom to retrieve the quota limits. If null, only global limits are returned.
     *
     * @return array<string, int> An associative array where keys are scope identifiers (e.g., 'global', 'user:{id}') and values are the corresponding token limits.
     */
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
