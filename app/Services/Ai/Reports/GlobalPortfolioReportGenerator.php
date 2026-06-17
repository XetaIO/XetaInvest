<?php

declare(strict_types=1);

namespace App\Services\Ai\Reports;

use App\Enums\AiReportType;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Tools\Concrete\GetPortfoliosTool;

class GlobalPortfolioReportGenerator extends BaseReportGenerator
{
    public function __construct(
        AiManager $manager,
        AiUsageLogger $usage,
        protected GetPortfoliosTool $portfoliosTool,
    ) {
        parent::__construct($manager, $usage);
    }

    /**
     * Returns the type of the report being generated, which is 'global' for this generator.
     *
     * @return string The report type as a string.
     */
    public function type(): string
    {
        return AiReportType::Global->value;
    }

    /**
     * Returns the type of scope for which reports are generated, which is null for global reports.
     *
     * @return ?string The scope type as a string, or null if not applicable.
     */
    public function scopeType(): ?string
    {
        return null;
    }

    protected function purpose(): string
    {
        return 'report_global';
    }

    /**
     * Builds the messages to be sent to the AI for generating the global portfolio report, including system and user messages with relevant context.
     *
     * @param User $user The user for whom the report is being generated.
     * @param mixed $scope The scope of the report, which is not used in this generator.
     *
     * @return array<int, array<string, mixed>> An array of messages formatted for the AI chat.
     */
    protected function buildMessages(User $user, mixed $scope): array
    {
        $context = $this->portfoliosTool->execute($user, []);

        return [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Analyse l'ensemble des portefeuilles de l'utilisateur (vue globale) et produis le rapport JSON demandé. Concentre-toi sur: diversification globale, exposition par portefeuille, performance agrégée, risques de concentration, suggestions de rééquilibrage.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
