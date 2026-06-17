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

    /**
     * Returns the type of the report being generated, which is 'portfolio' for this generator.
     *
     * @return string The report type as a string.
     */
    public function type(): string
    {
        return AiReportType::Portfolio->value;
    }

    /**
     * Returns the type of scope for which reports are generated, which is 'portfolio' for this generator.
     *
     * @return ?string The scope type as a string, or null if not applicable.
     */
    public function scopeType(): ?string
    {
        return Portfolio::class;
    }

    /**
     * Returns the purpose of the report, which is 'report_portfolio' for this generator.
     *
     * @return string The purpose of the report as a string.
     */
    protected function purpose(): string
    {
        return 'report_portfolio';
    }

    /**
     * Builds the messages to be sent to the AI for generating the portfolio report, including system and user messages with relevant context.
     *
     * @param User $user The user for whom the report is being generated.
     * @param mixed $scope The scope of the report, which should be a Portfolio instance or an ID.
     *
     * @return array<int, array<string, mixed>> An array of messages formatted for the AI chat.
     */
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
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Analyse le portefeuille suivant et produis le rapport JSON demandé. Mets en avant la performance, l'allocation, les risques (concentration sectorielle / devise / titre unique) et 1 à 3 recommandations actionnables.\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
