<?php

declare(strict_types=1);

use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Reports\BaseReportGenerator;

final class ParseContentTestReportGenerator extends BaseReportGenerator
{
    public function type(): string
    {
        return 'test';
    }

    public function scopeType(): ?string
    {
        return null;
    }

    protected function purpose(): string
    {
        return 'test';
    }

    protected function buildMessages(User $user, mixed $scope): array
    {
        return [];
    }

    public function parse(AiResponse $response): array
    {
        return $this->parseContent($response);
    }
}

beforeEach(function (): void {
    $this->generator = new ParseContentTestReportGenerator(
        Mockery::mock(AiManager::class),
        Mockery::mock(AiUsageLogger::class),
    );
});

test('parseContent decodes valid JSON content', function (): void {
    $response = new AiResponse(
        content: '{"summary":"Hello","highlights":[],"risks":[],"recommendations":[],"narrative_md":"Body"}',
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 1,
        completionTokens: 1,
        model: 'test',
        provider: 'openai',
    );

    $parsed = $this->generator->parse($response);

    expect($parsed['summary'])->toBe('Hello')
        ->and($parsed['narrative_md'])->toBe('Body');
});

test('parseContent unwraps nested narrative_md JSON string', function (): void {
    $inner = json_encode([
        'summary' => 'Nested',
        'highlights' => ['One'],
        'risks' => [],
        'recommendations' => [],
        'narrative_md' => 'Nested body',
    ], JSON_THROW_ON_ERROR);

    $response = new AiResponse(
        content: json_encode(['narrative_md' => $inner], JSON_THROW_ON_ERROR),
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 1,
        completionTokens: 1,
        model: 'test',
        provider: 'openai',
    );

    $parsed = $this->generator->parse($response);

    expect($parsed['summary'])->toBe('Nested')
        ->and($parsed['highlights'])->toBe(['One']);
});

test('parseContent falls back to narrative_md for non-json content', function (): void {
    $response = new AiResponse(
        content: 'Plain markdown analysis',
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 1,
        completionTokens: 1,
        model: 'test',
        provider: 'openai',
    );

    $parsed = $this->generator->parse($response);

    expect($parsed)->toBe(['narrative_md' => 'Plain markdown analysis']);
});

test('parseContent keeps outer JSON when nested narrative_md is invalid JSON', function (): void {
    $response = new AiResponse(
        content: json_encode(['narrative_md' => 'not-json'], JSON_THROW_ON_ERROR),
        toolCalls: [],
        finishReason: 'stop',
        promptTokens: 1,
        completionTokens: 1,
        model: 'test',
        provider: 'openai',
    );

    $parsed = $this->generator->parse($response);

    expect($parsed['narrative_md'])->toBe('not-json');
});
