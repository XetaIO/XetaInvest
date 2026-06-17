<?php

declare(strict_types=1);

namespace App\Services\Ai\Reports;

use App\Enums\AiReportType;
use App\Models\User;
use App\Services\Ai\AiManager;
use App\Services\Ai\AiUsageLogger;
use App\Services\FinanceQueryClient;
use Throwable;

class NewsScreenerReportGenerator extends BaseReportGenerator
{
    public function __construct(
        AiManager $manager,
        AiUsageLogger $usage,
        protected FinanceQueryClient $finance,
    ) {
        parent::__construct($manager, $usage);
    }

    /**
     * Returns the type of the report being generated, which is 'news_screener' for this generator.
     *
     * @return string The report type as a string.
     */
    public function type(): string
    {
        return AiReportType::NewsScreener->value;
    }

    public function scopeType(): ?string
    {
        return null;
    }

    /**
     * Returns the purpose of the report, which is 'report_news_screener' for this generator.
     *
     * @return string The purpose of the report as a string.
     */
    protected function purpose(): string
    {
        return 'report_news_screener';
    }

    /**
     * Builds the messages to be sent to the AI for generating the news screener report, including system and user messages with relevant context.
     *
     * @param User $user The user for whom the report is being generated.
     * @param mixed $scope The scope of the report, which is not used in this generator.
     *
     * @return array An array of messages formatted for the AI chat.
     */
    protected function buildMessages(User $user, mixed $scope): array
    {
        $defaults = config('ai.screener_defaults');
        $regions = (array) ($defaults['regions'] ?? ['fr', 'us']);
        $limit = (int) ($defaults['per_region_limit'] ?? 10);
        $minCap = (float) ($defaults['min_market_cap'] ?? 1_000_000_000);
        $minGrowth = (float) ($defaults['min_revenue_growth'] ?? 0.15);
        $minPct = (float) ($defaults['min_percent_change'] ?? 0.0);

        $results = [];

        foreach ($regions as $region) {
            $payload = [
                'quoteType' => 'EQUITY',
                'filters' => [
                    ['field' => 'region', 'operator' => 'eq', 'value' => strtolower((string) $region)],
                    ['field' => 'intradaymarketcap', 'operator' => 'gt', 'value' => $minCap],
                    ['field' => 'quarterlyrevenuegrowth.quarterly', 'operator' => 'gt', 'value' => $minGrowth],
                    ['field' => 'percentchange', 'operator' => 'gt', 'value' => $minPct],
                ],
                'sortType' => 'DESC',
                'sortField' => 'percentchange',
                'limit' => $limit,
            ];

            try {
                $results[strtoupper((string) $region)] = $this->finance->screener($payload);
            } catch (Throwable $e) {
                $results[strtoupper((string) $region)] = ['error' => $e->getMessage()];
            }
        }

        $context = [
            'criteria' => [
                'min_market_cap_usd' => $minCap,
                'min_revenue_growth_yoy' => $minGrowth,
                'min_percent_change_today' => $minPct,
            ],
            'screener_results' => $results,
        ];

        return [
            ['role' => 'system', 'content' => $this->systemPrompt($user)],
            ['role' => 'user', 'content' => "Voici les résultats d'un screener FR et US filtrant les sociétés à forte croissance. Produis le rapport JSON: synthèse des opportunités, secteurs porteurs, top 5 titres FR et top 5 titres US avec rationale, alertes (valorisations excessives, signaux de prudence).\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
