<?php

declare(strict_types=1);

use App\Models\AiReport;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Reports\GlobalPortfolioReportGenerator;
use App\Services\Ai\Tools\Concrete\GetPortfoliosTool;
use Carbon\CarbonImmutable;

/**
 * Returns a GlobalPortfolioReportGenerator with all dependencies mocked.
 * The AI provider always returns a valid minimal JSON response.
 */
function makeGenerator(): GlobalPortfolioReportGenerator
{
    $provider = Mockery::mock(AiProvider::class);
    $provider->allows('name')->andReturn('openai');
    $provider->allows('chat')->andReturn(new AiResponse(
        content: '{"summary":"ok","highlights":[],"risks":[],"recommendations":[],"narrative_md":""}',
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 10,
        completionTokens: 20,
        model: 'gpt-4o-mini',
        provider: 'openai',
    ));

    $manager = Mockery::mock(AiManager::class);
    $manager->allows('driver')->andReturn($provider);

    $usage = Mockery::mock(AiUsageLogger::class);
    $usage->allows('ensureWithinQuota');
    $usage->allows('record')->andReturn(0.0);

    $portfoliosTool = Mockery::mock(GetPortfoliosTool::class);
    $portfoliosTool->allows('execute')->andReturn([]);

    return new GlobalPortfolioReportGenerator($manager, $usage, $portfoliosTool);
}

describe('BaseReportGenerator date behaviour', function (): void {
    test('generated_for_date defaults to tomorrow when no date is given', function (): void {
        $user = User::factory()->create();
        $generator = makeGenerator();

        $report = $generator->generate($user);

        expect($report->generated_for_date->toDateString())
            ->toBe(CarbonImmutable::tomorrow()->toDateString());
    });

    test('generated_for_date uses the explicit date when provided', function (): void {
        $user = User::factory()->create();
        $generator = makeGenerator();
        $specificDate = CarbonImmutable::parse('2026-06-15');

        $report = $generator->generate($user, null, $specificDate);

        expect($report->generated_for_date->toDateString())->toBe('2026-06-15');
    });

    test('frontend query finds the report on the day after generation', function (): void {
        $user = User::factory()->create();
        $generator = makeGenerator();

        // Simulate: report generated tonight
        $generator->generate($user);

        // Simulate: user opens dashboard tomorrow morning
        $tomorrowReport = AiReport::query()
            ->where('user_id', $user->id)
            ->where('type', 'global')
            ->whereDate('generated_for_date', CarbonImmutable::tomorrow()->toDateString())
            ->first();

        expect($tomorrowReport)->not->toBeNull();
    });
});
