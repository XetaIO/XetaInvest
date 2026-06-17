<?php

declare(strict_types=1);

use App\Enums\AiReportType;
use App\Models\AiReport;
use App\Models\User;
use Illuminate\Support\Carbon;

test('todayFor returns the report for the user type and date', function (): void {
    Carbon::setTestNow('2026-06-16 12:00:00');

    $user = User::factory()->create();

    $report = AiReport::query()->create([
        'user_id' => $user->id,
        'type' => AiReportType::Global,
        'generated_for_date' => today(),
        'status' => 'success',
        'content' => ['narrative_md' => 'today report'],
    ]);

    expect(AiReport::query()->todayFor($user, AiReportType::Global)->first()?->id)->toBe($report->id);
});

test('todayFor filters by scope id when provided', function (): void {
    Carbon::setTestNow('2026-06-16 12:00:00');

    $user = User::factory()->create();

    AiReport::query()->create([
        'user_id' => $user->id,
        'type' => AiReportType::Portfolio,
        'scope_id' => 1,
        'generated_for_date' => today(),
        'status' => 'success',
        'content' => ['narrative_md' => 'portfolio 1'],
    ]);

    AiReport::query()->create([
        'user_id' => $user->id,
        'type' => AiReportType::Portfolio,
        'scope_id' => 2,
        'generated_for_date' => today(),
        'status' => 'success',
        'content' => ['narrative_md' => 'portfolio 2'],
    ]);

    $report = AiReport::query()->todayFor($user, AiReportType::Portfolio, 2)->first();

    expect($report?->scope_id)->toBe(2);
});

test('todayFor excludes reports from other users', function (): void {
    Carbon::setTestNow('2026-06-16 12:00:00');

    $user = User::factory()->create();
    $other = User::factory()->create();

    AiReport::query()->create([
        'user_id' => $other->id,
        'type' => AiReportType::Watchlist,
        'generated_for_date' => today(),
        'status' => 'success',
        'content' => ['narrative_md' => 'other'],
    ]);

    expect(AiReport::query()->todayFor($user, AiReportType::Watchlist)->first())->toBeNull();
});
