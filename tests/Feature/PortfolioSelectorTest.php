<?php

declare(strict_types=1);

use App\Models\Portfolio;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('listFor returns portfolios ordered by default then name', function (): void {
    $second = Portfolio::factory()->forUser($this->user)->create(['name' => 'B', 'is_default' => false]);
    $first = Portfolio::factory()->forUser($this->user)->create(['name' => 'A', 'is_default' => true]);

    $list = app(\App\Services\PortfolioSelector::class)->listFor($this->user);

    expect($list->pluck('id')->all())->toBe([$first->id, $second->id]);
});

test('resolveForDashboard falls back to default portfolio', function (): void {
    $default = Portfolio::factory()->forUser($this->user)->default()->create(['name' => 'Default']);
    Portfolio::factory()->forUser($this->user)->create(['name' => 'Other', 'is_default' => false]);

    $list = app(\App\Services\PortfolioSelector::class)->listFor($this->user);
    $resolved = app(\App\Services\PortfolioSelector::class)->resolveForDashboard($list, 0);

    expect($resolved?->id)->toBe($default->id);
});

test('resolveForDashboard selects portfolio by id', function (): void {
    Portfolio::factory()->forUser($this->user)->default()->create(['name' => 'Default']);
    $target = Portfolio::factory()->forUser($this->user)->create(['name' => 'Target', 'is_default' => false]);

    $list = app(\App\Services\PortfolioSelector::class)->listFor($this->user);
    $resolved = app(\App\Services\PortfolioSelector::class)->resolveForDashboard($list, $target->id);

    expect($resolved?->id)->toBe($target->id);
});

test('resolveForStatistics supports all scope', function (): void {
    Portfolio::factory()->forUser($this->user)->default()->create();

    $result = app(\App\Services\PortfolioSelector::class)->resolveForStatistics($this->user, 'all');

    expect($result['scope'])->toBe('all')
        ->and($result['portfolio'])->toBeNull();
});

test('resolveForStatistics returns portfolio for valid id', function (): void {
    $portfolio = Portfolio::factory()->forUser($this->user)->default()->create();

    $result = app(\App\Services\PortfolioSelector::class)->resolveForStatistics($this->user, (string) $portfolio->id);

    expect($result['scope'])->toBe((string) $portfolio->id)
        ->and($result['portfolio']?->id)->toBe($portfolio->id);
});

test('resolveForStatistics aborts when portfolio id is invalid', function (): void {
    Portfolio::factory()->forUser($this->user)->default()->create();

    app(\App\Services\PortfolioSelector::class)->resolveForStatistics($this->user, '99999');
})->throws(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);

test('resolveForStatistics aborts when portfolio belongs to another user', function (): void {
    $other = User::factory()->create();
    $portfolio = Portfolio::factory()->forUser($other)->create();

    app(\App\Services\PortfolioSelector::class)->resolveForStatistics($this->user, (string) $portfolio->id);
})->throws(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);
