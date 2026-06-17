<?php

declare(strict_types=1);

namespace App\Services\Ai\Chat;

use App\Enums\AiChatRole;
use App\Models\AiChatMessage;
use App\Models\AiChatSession;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Tools\AiToolRegistry;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiChatService
{
    public function __construct(
        protected AiManager $manager,
        protected AiToolRegistry $tools,
        protected AiUsageLogger $usage,
    ) {
    }

    /**
     * Sends a message from the user to the AI chat session, processes the response, and handles any tool calls made by the AI.
     *
     * @param User $user The user sending the message.
     * @param AiChatSession $session The chat session to which the message is sent.
     * @param string $content The content of the user's message.
     *
     * @return AiChatMessage The assistant's response message.
     */
    public function sendMessage(User $user, AiChatSession $session, string $content): AiChatMessage
    {
        $session->messages()->create([
            'role' => AiChatRole::User->value,
            'content' => $content,
        ]);

        $session->update(['last_message_at' => now()]);

        if (! $session->title) {
            $session->update(['title' => mb_substr($content, 0, 80)]);
        }

        $history = $this->buildMessageHistory($user, $session);
        $toolSchemas = $this->tools->schemas();
        $maxIterations = (int) config('ai.defaults.max_tool_iterations', 5);

        $assistantMessage = null;

        for ($i = 0; $i < $maxIterations; $i++) {
            $reservation = $this->usage->reserve(
                $user,
                (int) config('ai.defaults.quota_reservation_tokens'),
            );

            try {
                $response = $this->manager->driver()->chat($history, $toolSchemas, [
                    'model' => config('ai.models.chat'),
                    'temperature' => config('ai.defaults.temperature'),
                    'max_tokens' => config('ai.defaults.max_tokens'),
                ]);

                $this->usage->record($user, 'chat', $response, $reservation);
            } catch (Throwable $exception) {
                $this->usage->release($reservation);

                throw $exception;
            }

            if ($response->hasToolCalls()) {
                $history[] = [
                    'role' => 'assistant',
                    'content' => $response->content,
                    'tool_calls' => array_map(static fn (array $c): array => [
                        'id' => $c['id'],
                        'type' => 'function',
                        'function' => [
                            'name' => $c['name'],
                            'arguments' => json_encode($c['arguments'], JSON_UNESCAPED_UNICODE),
                        ],
                    ], $response->toolCalls),
                ];

                $session->messages()->create([
                    'role' => AiChatRole::Assistant->value,
                    'content' => $response->content,
                    'tool_calls' => $response->toolCalls,
                    'prompt_tokens' => $response->promptTokens,
                    'completion_tokens' => $response->completionTokens,
                ]);

                foreach ($response->toolCalls as $call) {
                    $result = $this->executeTool($user, $call['name'], $call['arguments']);

                    $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE);

                    $history[] = [
                        'role' => 'tool',
                        'tool_call_id' => $call['id'],
                        'name' => $call['name'],
                        'content' => $resultJson,
                    ];

                    $session->messages()->create([
                        'role' => AiChatRole::Tool->value,
                        'content' => $resultJson,
                        'tool_call_id' => $call['id'],
                        'tool_name' => $call['name'],
                    ]);
                }

                continue;
            }

            $assistantMessage = $session->messages()->create([
                'role' => AiChatRole::Assistant->value,
                'content' => $response->content ?? '',
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
            ]);

            break;
        }

        if ($assistantMessage === null) {
            $assistantMessage = $session->messages()->create([
                'role' => AiChatRole::Assistant->value,
                'content' => 'Désolé, je n\'ai pas pu finaliser la réponse (limite d\'itérations atteinte).',
            ]);
        }

        $session->update(['last_message_at' => now()]);

        return $assistantMessage->refresh();
    }

    /**
     * Builds the message history for the AI chat session, including system prompts and previous messages.
     *
     * @param User $user The user associated with the chat session.
     * @param AiChatSession $session The chat session for which to build the message history.
     *
     * @return array An array of messages formatted for the AI model, including system prompts and previous messages.
     */
    protected function buildMessageHistory(User $user, AiChatSession $session): array
    {
        $limit = (int) config('ai.defaults.chat_history_limit', 20);

        $messages = $session->messages()
            ->orderBy('id')
            ->get()
            ->take(-$limit);

        $out = [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
        ];

        foreach ($messages as $msg) {
            $role = $msg->role instanceof AiChatRole ? $msg->role->value : (string) $msg->role;

            if ($role === AiChatRole::Tool->value) {
                $out[] = [
                    'role' => 'tool',
                    'tool_call_id' => $msg->tool_call_id ?? '',
                    'name' => $msg->tool_name ?? '',
                    'content' => $msg->content ?? '',
                ];

                continue;
            }

            $entry = ['role' => $role, 'content' => $msg->content];

            if ($role === AiChatRole::Assistant->value && ! empty($msg->tool_calls)) {
                $entry['tool_calls'] = array_map(static fn (array $c): array => [
                    'id' => $c['id'] ?? '',
                    'type' => 'function',
                    'function' => [
                        'name' => $c['name'] ?? '',
                        'arguments' => json_encode($c['arguments'] ?? [], JSON_UNESCAPED_UNICODE),
                    ],
                ], $msg->tool_calls);
            }

            $out[] = $entry;
        }

        return $out;
    }

    /**
     * Executes a tool call made by the AI, handling any exceptions and logging errors.
     *
     * @param User $user The user for whom the tool is being executed.
     * @param string $name The name of the tool to execute.
     * @param array $args The arguments to pass to the tool.
     *
     * @return array The result of the tool execution, or an error message if the tool is unknown or fails.
     */
    protected function executeTool(User $user, string $name, array $args): array
    {
        if (! $this->tools->has($name)) {
            return ['error' => 'unknown_tool', 'name' => $name];
        }

        try {
            return $this->tools->execute($name, $user, $args);
        } catch (Throwable $e) {
            Log::warning('AI tool failed', ['tool' => $name, 'error' => $e->getMessage()]);

            return ['error' => 'tool_execution_failed'];
        }
    }

    /**
     * Generates the system prompt for the AI chat session based on the user's locale.
     *
     * @param User $user The user for whom to generate the system prompt.
     *
     * @return string The system prompt string, tailored to the user's language preference.
     */
    protected function systemPrompt(User $user): string
    {
        $language = $user->locale === 'en' ? 'English' : 'French';

        return <<<PROMPT
        You are the AI assistant for XetaInvest, a personal investing application.
        Always answer in {$language}, concisely, cautiously and factually.
        You may call read-only tools for portfolios, watchlists, quotes, news and screeners.
        Strict rules:
          - Never promise future performance.
          - Do not provide tax or legal advice.
          - Mention third-party data and delayed quote limitations.
          - Be brief by default and expand only when asked.
          - Use tools whenever current user or market data is required.
        PROMPT;
    }
}
