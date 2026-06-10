<?php

declare(strict_types=1);

use App\Models\AiDailyQuota;
use App\Models\AiUsage;
use App\Models\User;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Exceptions\AiQuotaExceededException;

test('it atomically reserves and records daily quota consumption', function (): void {
    config()->set('ai.quotas.daily_tokens_per_user', 100);
    config()->set('ai.quotas.daily_tokens_global', 200);

    $user = User::factory()->create();
    $logger = app(AiUsageLogger::class);
    $reservation = $logger->reserve($user, 50);

    expect(AiDailyQuota::query()->sum('reserved_tokens'))->toBe(100);

    $logger->record($user, 'test', new AiResponse(
        content: 'ok',
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 10,
        completionTokens: 20,
        model: 'test-model',
        provider: 'openai',
    ), $reservation);

    expect(AiDailyQuota::query()->sum('reserved_tokens'))->toBe(0)
        ->and(AiDailyQuota::query()->sum('consumed_tokens'))->toBe(60)
        ->and(AiUsage::query()->count())->toBe(1);
});

test('it rejects a reservation that would exceed a user quota', function (): void {
    config()->set('ai.quotas.daily_tokens_per_user', 50);
    config()->set('ai.quotas.daily_tokens_global', 0);

    $user = User::factory()->create();
    $logger = app(AiUsageLogger::class);
    $logger->reserve($user, 40);

    expect(fn () => $logger->reserve($user, 20))
        ->toThrow(AiQuotaExceededException::class);
});

test('it releases a reservation after a provider failure', function (): void {
    config()->set('ai.quotas.daily_tokens_per_user', 100);
    config()->set('ai.quotas.daily_tokens_global', 0);

    $user = User::factory()->create();
    $logger = app(AiUsageLogger::class);
    $reservation = $logger->reserve($user, 40);

    $logger->release($reservation);

    expect(AiDailyQuota::query()->value('reserved_tokens'))->toBe(0);
});
