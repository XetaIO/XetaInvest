<?php

declare(strict_types=1);

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Exceptions\AiException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OpenAiProvider implements AiProvider
{
    /**
     * OpenAiProvider constructor.
     *
     * @param array<string, mixed> $config Configuration settings for the OpenAI provider, including API key and base URL.
     *
     * @throws AiException If the API key is missing from the configuration.
     */
    public function __construct(protected array $config)
    {
        if (empty($this->config['api_key'])) {
            throw new AiException('OpenAI API key is missing.');
        }
    }

    /**
     * Returns the name of the AI provider.
     *
     * @return string The name of the provider, which is 'openai'.
     */
    public function name(): string
    {
        return 'openai';
    }

    /**
     * Sends a chat request to the OpenAI API with the provided messages and tools, and returns the AI response.
     *
     * @param array $messages The messages to send to the AI model.
     * @param array $tools The tools available for the AI to use.
     * @param array $options Additional options for the chat request, such as model and temperature.
     *
     * @return AiResponse The response from the AI model, including content, tool calls, and usage information.
     *
     * @throws AiException If there is an error with the OpenAI request or response.
     */
    public function chat(array $messages, array $tools = [], array $options = []): AiResponse
    {
        $model = $options['model'] ?? config('ai.models.chat');
        $maxTokens = $options['max_tokens'] ?? config('ai.defaults.max_tokens');
        $maxTokensKey = $this->supportsMaxTokens((string) $model) ? 'max_tokens' : 'max_completion_tokens';

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? config('ai.defaults.temperature'),
            $maxTokensKey => $maxTokens,
        ];

        if ($tools !== []) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = $options['tool_choice'] ?? 'auto';
        }

        if (isset($options['response_format'])) {
            $payload['response_format'] = $options['response_format'];
        }

        try {
            $response = Http::baseUrl((string) $this->config['base_url'])
                ->withToken((string) $this->config['api_key'])
                ->when(! empty($this->config['organization']), fn ($req) => $req->withHeaders([
                    'OpenAI-Organization' => (string) $this->config['organization'],
                ]))
                ->timeout((float) ($this->config['timeout'] ?? 60))
                ->acceptJson()
                ->asJson()
                ->retry(2, 500, throw: false)
                ->post('/chat/completions', $payload);

            if ($response->failed()) {
                $body = $response->json();
                $msg = $body['error']['message'] ?? $response->body();

                Log::warning('OpenAI request failed', [
                    'status' => $response->status(),
                    'error' => $msg,
                ]);

                throw new AiException(sprintf('OpenAI request failed (HTTP %d): %s', $response->status(), $msg));
            }

            return $this->parse($response->json(), (string) $payload['model']);
        } catch (ConnectionException|RequestException $e) {
            throw new AiException('OpenAI unavailable: '.$e->getMessage(), 0, $e);
        } catch (Throwable $e) {
            if ($e instanceof AiException) {
                throw $e;
            }

            throw new AiException('OpenAI error: '.$e->getMessage(), 0, $e);
        }
    }

    /**
     * Parses the response payload from the OpenAI API and constructs an AiResponse object.
     *
     * @param array|null $payload The response payload from the OpenAI API.
     * @param string $model The model used for the request.
     *
     * @return AiResponse The parsed AI response, including content, tool calls, and usage information.
     */
    protected function parse(?array $payload, string $model): AiResponse
    {
        $payload ??= [];
        $choice = $payload['choices'][0] ?? [];
        $message = $choice['message'] ?? [];
        $usage = $payload['usage'] ?? [];

        $toolCalls = [];

        foreach ($message['tool_calls'] ?? [] as $call) {
            $arguments = [];

            if (isset($call['function']['arguments']) && is_string($call['function']['arguments'])) {
                $decoded = json_decode($call['function']['arguments'], true);
                $arguments = is_array($decoded) ? $decoded : [];
            }

            $toolCalls[] = [
                'id' => (string) ($call['id'] ?? ''),
                'name' => (string) ($call['function']['name'] ?? ''),
                'arguments' => $arguments,
            ];
        }

        return new AiResponse(
            content: isset($message['content']) && is_string($message['content']) ? $message['content'] : null,
            toolCalls: $toolCalls,
            finishReason: (string) ($choice['finish_reason'] ?? 'stop'),
            promptTokens: (int) ($usage['prompt_tokens'] ?? 0),
            completionTokens: (int) ($usage['completion_tokens'] ?? 0),
            model: (string) ($payload['model'] ?? $model),
            provider: 'openai',
            raw: $payload,
        );
    }

    /**
     * Newer OpenAI models (o1, o3, o4, gpt-5.x…) require `max_completion_tokens`.
     * Legacy models (gpt-3.x, gpt-4.x) use the old `max_tokens` parameter.
     *
     * @param string $model The model name to check.
     *
     * @return bool True if the model supports `max_tokens`, false if it requires `max_completion_tokens`.
     */
    private function supportsMaxTokens(string $model): bool
    {
        $newGenerationPrefixes = ['o1', 'o3', 'o4', 'gpt-5'];

        foreach ($newGenerationPrefixes as $prefix) {
            if (str_starts_with(strtolower($model), $prefix)) {
                return false;
            }
        }

        return true;
    }
}
