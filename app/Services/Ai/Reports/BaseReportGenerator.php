<?php

declare(strict_types=1);

namespace App\Services\Ai\Reports;

use App\Models\AiReport;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\DataTransferObjects\AiResponse;
use App\Services\Ai\Exceptions\AiException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

abstract class BaseReportGenerator
{
    public function __construct(
        protected AiManager $manager,
        protected AiUsageLogger $usage,
    ) {
    }

    abstract public function type(): string;

    abstract public function scopeType(): ?string;

    abstract protected function purpose(): string;

    /**
     * @return array<int, array<string, mixed>>
     */
    abstract protected function buildMessages(User $user, mixed $scope): array;

    /**
     * Run the generation and persist the AiReport row.
     */
    public function generate(User $user, mixed $scope = null, ?CarbonImmutable $date = null): AiReport
    {
        $date ??= CarbonImmutable::now()->addDay()->startOfDay();
        $scopeId = $this->scopeId($scope);

        $report = AiReport::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'type' => $this->type(),
                'scope_type' => $this->scopeType(),
                'scope_id' => $scopeId,
                'generated_for_date' => $date->toDateString(),
            ],
            [
                'status' => 'pending',
                'provider' => (string) config('ai.default'),
                'model' => (string) config('ai.models.report'),
            ],
        );

        $reservation = null;

        try {
            $messages = $this->buildMessages($user, $scope);
            $reservation = $this->usage->reserve(
                $user,
                (int) config('ai.defaults.quota_reservation_tokens'),
            );

            $response = $this->manager->driver()->chat($messages, [], [
                'model' => config('ai.models.report'),
                'temperature' => config('ai.defaults.temperature'),
                'max_tokens' => config('ai.defaults.max_tokens'),
                'response_format' => ['type' => 'json_object'],
            ]);

            $cost = $this->usage->record($user, $this->purpose(), $response, $reservation);
            $reservation = null;

            $report->update([
                'status' => 'success',
                'provider' => $response->provider,
                'model' => $response->model,
                'content' => $this->parseContent($response),
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
                'cost_estimate' => $cost,
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            if ($reservation !== null) {
                $this->usage->release($reservation);
            }

            $errorId = (string) Str::uuid();

            Log::warning('AI report generation failed', [
                'error_id' => $errorId,
                'type' => $this->type(),
                'user_id' => $user->id,
                'scope_id' => $scopeId,
                'error' => $e->getMessage(),
            ]);

            $report->update([
                'status' => 'failed',
                'error_message' => __('messages.ai.unavailable', ['reference' => $errorId]),
            ]);
        }

        return $report->refresh();
    }

    protected function scopeId(mixed $scope): ?int
    {
        if ($scope === null) {
            return null;
        }

        if (is_object($scope) && isset($scope->id) && is_numeric($scope->id)) {
            return (int) $scope->id;
        }

        if (is_numeric($scope)) {
            return (int) $scope;
        }

        return null;
    }

    /**
     * Decode the JSON content from the AI. Falls back to {narrative_md} if not valid JSON.
     *
     * @return array<string, mixed>
     */
    protected function parseContent(AiResponse $response): array
    {
        $raw = (string) ($response->content ?? '');
        $decoded = json_decode($raw, true);

        if (is_array($decoded)) {
            // Some models collapse everything into a single narrative_md key whose value
            // is itself a JSON string (e.g. gpt-5.x). Unwrap it transparently.
            if (
                count($decoded) === 1
                && isset($decoded['narrative_md'])
                && is_string($decoded['narrative_md'])
            ) {
                $inner = json_decode($decoded['narrative_md'], true);

                if (is_array($inner)) {
                    return $inner;
                }
            }

            return $decoded;
        }

        return ['narrative_md' => $raw];
    }

    protected function systemPrompt(User $user): string
    {
        $language = $user->locale === 'en' ? 'English' : 'French';

        return <<<PROMPT
        You are a financial assistant for the XetaInvest application.
        Write every user-facing value in {$language}.
        Produce clear, neutral, factual and cautious analysis.
        Never guarantee future performance.
        Reply strictly as valid JSON with no surrounding text, using these keys:
          - summary (string, 1-2 sentences)
          - highlights (array of short strings)
          - risks (array of short strings)
          - recommendations (array of objects {action: "buy"|"hold"|"sell"|"watch", symbol?: string, rationale: string})
          - narrative_md (string, detailed markdown analysis)
        PROMPT;
    }

    protected function ensureProviderConfigured(): void
    {
        if (! config('ai.providers.'.config('ai.default').'.api_key')) {
            throw new AiException('AI provider is not configured (missing API key).');
        }
    }
}
