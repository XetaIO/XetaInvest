<?php

declare(strict_types=1);

namespace App\Services\Ai\DataTransferObjects;

/**
 * Normalized response returned by every AiProvider.
 *
 * @phpstan-type ToolCall array{id: string, name: string, arguments: array<string, mixed>}
 */
class AiResponse
{
    /**
     * @param  array<int, array{id: string, name: string, arguments: array<string, mixed>}>  $toolCalls
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public readonly ?string $content,
        public readonly array $toolCalls,
        public readonly string $finishReason,
        public readonly int $promptTokens,
        public readonly int $completionTokens,
        public readonly string $model,
        public readonly string $provider,
        public readonly array $raw = [],
    ) {
    }

    public function hasToolCalls(): bool
    {
        return $this->toolCalls !== [];
    }
}
