<?php

declare(strict_types=1);

namespace App\Services\Ai\Contracts;

use App\Services\Ai\DataTransferObjects\AiResponse;

interface AiProvider
{
    /**
     * Send a chat completion request.
     *
     * @param  array<int, array<string, mixed>>  $messages  Provider-agnostic OpenAI-style messages.
     * @param  array<int, array<string, mixed>>  $tools  OpenAI-style tool definitions ({type:function, function:{name, description, parameters}}).
     * @param  array<string, mixed>  $options  model, temperature, max_tokens, tool_choice, response_format...
     *
     * @return AiResponse The AI response containing the assistant's message and any tool calls.
     */
    public function chat(array $messages, array $tools = [], array $options = []): AiResponse;

    /**
     * Get the name of the AI provider.
     *
     * @return string The name of the AI provider.
     */
    public function name(): string;
}
