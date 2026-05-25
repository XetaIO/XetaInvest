<?php

declare(strict_types=1);

namespace App\Services\Ai\Reports;

use App\Enums\AiReportType;
use App\Models\Portfolio;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\Ai\Tools\Concrete\GetPortfolioDetailTool;
use App\Services\Ai\Tools\Concrete\GetPortfoliosTool;

class PortfolioReportGenerator extends BaseReportGenerator
{
    public function __construct(
        AiManager $manager,
        AiUsageLogger $usage,
        protected GetPortfoliosTool $portfoliosTool,
        protected GetPortfolioDetailTool $detailTool,
    ) {
        parent::__construct($manager, $usage);
    }

    public function type(): string
    {
        return AiReportType::Portfolio->value;
    }

    public function scopeType(): ?string
    {
        return Portfolio::class;
    }

    protected function purpose(): string
    {
        return 'report_portfolio';
    }

    protected function buildMessages(User $user, mixed $scope): array
    {
        $portfolio = $scope instanceof Portfolio ? $scope : Portfolio::findOrFail((int) $scope);

        $detail = $this->detailTool->execute($user, ['portfolio_id' => $portfolio->id]);
        $kpis = $this->portfoliosTool->execute($user, []);

        $context = [
            'portfolio_kpis' => collect($kpis['portfolios'] ?? [])
                ->firstWhere('id', $portfolio->id),
            'portfolio_detail' => $detail,
        ];

        return [
            ['role' => 'system', 'content' => $this->systemPrompt()],
            ['role' => 'user', 'content' => "Analyse le portefeuille suivant et produis le rapport JSON demandé. Mets en avant la performance, l'allocation, les risques (concentration sectorielle / devise / titre unique) et 1 à 3 recommandations actionnables.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
