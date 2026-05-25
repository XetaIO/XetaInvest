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
     * @param  array<string, mixed>  $config
     */
    public function __construct(protected array $config)
    {
        if (empty($this->config['api_key'])) {
            throw new AiException('OpenAI API key is missing.');
        }
    }

    public function name(): string
    {
        return 'openai';
    }

    /**
     * @param  array<int, array<string, mixed>>  $messages
     * @param  array<int, array<string, mixed>>  $tools
     * @param  array<string, mixed>  $options
     */
    public function chat(array $messages, array $tools = [], array $options = []): AiResponse
    {
        $payload = [
            'model' => $options['model'] ?? config('ai.models.chat'),
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? config('ai.defaults.temperature'),
            'max_tokens' => $options['max_tokens'] ?? config('ai.defaults.max_tokens'),
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
     * @param  array<string, mixed>|null  $payload
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
}
