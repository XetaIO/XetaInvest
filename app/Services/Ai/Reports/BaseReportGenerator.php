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
        $date ??= CarbonImmutable::now()->startOfDay();
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

        try {
            $this->usage->ensureWithinQuota($user);

            $messages = $this->buildMessages($user, $scope);

            $response = $this->manager->driver()->chat($messages, [], [
                'model' => config('ai.models.report'),
                'temperature' => config('ai.defaults.temperature'),
                'max_tokens' => config('ai.defaults.max_tokens'),
                'response_format' => ['type' => 'json_object'],
            ]);

            $cost = $this->usage->record($user, $this->purpose(), $response);

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
            Log::warning('AI report generation failed', [
                'type' => $this->type(),
                'user_id' => $user->id,
                'scope_id' => $scopeId,
                'error' => $e->getMessage(),
            ]);

            $report->update([
                'status' => 'failed',
                'error_message' => mb_substr($e->getMessage(), 0, 500),
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
            return $decoded;
        }

        return ['narrative_md' => $raw];
    }

    protected function systemPrompt(): string
    {
        return <<<'PROMPT'
        Tu es un assistant financier français pour l'application XetaInvest.
        Tu produis des analyses claires, neutres, factuelles et prudentes.
        Tu ne donnes JAMAIS de garantie de performance.
        Tu réponds STRICTEMENT en JSON valide, sans texte autour, avec les clés:
          - summary (string, 1-2 phrases)
          - highlights (array de string courts)
          - risks (array de string courts)
          - recommendations (array d'objets {action: "buy"|"hold"|"sell"|"watch", symbol?: string, rationale: string})
          - narrative_md (string, analyse détaillée en markdown FR)
        PROMPT;
    }

    protected function ensureProviderConfigured(): void
    {
        if (! config('ai.providers.'.config('ai.default').'.api_key')) {
            throw new AiException('AI provider is not configured (missing API key).');
        }
    }
}
