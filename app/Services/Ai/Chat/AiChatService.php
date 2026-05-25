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
     * Process a user message in a chat session and return the assistant reply (the last AiChatMessage).
     */
    public function sendMessage(User $user, AiChatSession $session, string $content): AiChatMessage
    {
        $this->usage->ensureWithinQuota($user);

        $session->messages()->create([
            'role' => AiChatRole::User->value,
            'content' => $content,
        ]);

        $session->update(['last_message_at' => now()]);

        if (! $session->title) {
            $session->update(['title' => mb_substr($content, 0, 80)]);
        }

        $history = $this->buildMessageHistory($session);
        $toolSchemas = $this->tools->schemas();
        $maxIterations = (int) config('ai.defaults.max_tool_iterations', 5);

        $assistantMessage = null;

        for ($i = 0; $i < $maxIterations; $i++) {
            $response = $this->manager->driver()->chat($history, $toolSchemas, [
                'model' => config('ai.models.chat'),
                'temperature' => config('ai.defaults.temperature'),
                'max_tokens' => config('ai.defaults.max_tokens'),
            ]);

            $this->usage->record($user, 'chat', $response);

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
     * @return array<int, array<string, mixed>>
     */
    protected function buildMessageHistory(AiChatSession $session): array
    {
        $limit = (int) config('ai.defaults.chat_history_limit', 20);

        $messages = $session->messages()
            ->orderBy('id')
            ->get()
            ->take(-$limit);

        $out = [
            ['role' => 'system', 'content' => $this->systemPrompt()],
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
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
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

            return ['error' => 'tool_execution_failed', 'message' => $e->getMessage()];
        }
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
        Tu es l'assistant IA de l'application XetaInvest (investissement boursier personnel).
        Tu réponds toujours en français, de manière concise, prudente et factuelle.
        Tu peux appeler des outils en lecture seule pour récupérer les portfolios, watchlists, cotations, news et lancer des screeners.
        Règles strictes:
          - Ne JAMAIS promettre de performance future.
          - Pas de conseil fiscal ou juridique.
          - Mentionner les limites (données API tierces, retards de cotation).
          - Sois bref par défaut, développe à la demande.
          - Utilise les outils dès que la réponse exige des données utilisateur ou marché récentes.
        PROMPT;
    }
}
