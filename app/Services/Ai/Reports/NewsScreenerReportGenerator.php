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

    public function type(): string
    {
        return AiReportType::NewsScreener->value;
    }

    public function scopeType(): ?string
    {
        return null;
    }

    protected function purpose(): string
    {
        return 'report_news_screener';
    }

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
                'fields' => [
                    'intradayprice', 'percentchange', 'intradaymarketcap',
                    'peratio.lasttwelvemonths', 'quarterlyrevenuegrowth.quarterly',
                    'sector', 'industry', 'currency',
                ],
                'sort' => ['field' => 'percentchange', 'direction' => 'desc'],
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
            ['role' => 'system', 'content' => $this->systemPrompt()],
            ['role' => 'user', 'content' => "Voici les résultats d'un screener FR et US filtrant les sociétés à forte croissance. Produis le rapport JSON: synthèse des opportunités, secteurs porteurs, top 5 titres FR et top 5 titres US avec rationale, alertes (valorisations excessives, signaux de prudence).\n\nDonnées:\n".json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)],
        ];
    }
}
