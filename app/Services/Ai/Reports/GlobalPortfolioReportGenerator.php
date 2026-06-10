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

    public function type(): string
    {
        return AiReportType::Global->value;
    }

    public function scopeType(): ?string
    {
        return null;
    }

    protected function purpose(): string
    {
        return 'report_global';
    }

    protected function buildMessages(User $user, mixed $scope): array
    {
        $context = $this->portfoliosTool->execute($user, []);

        return [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Analyse l'ensemble des portefeuilles de l'utilisateur (vue globale) et produis le rapport JSON demandé. Concentre-toi sur: diversification globale, exposition par portefeuille, performance agrégée, risques de concentration, suggestions de rééquilibrage.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
