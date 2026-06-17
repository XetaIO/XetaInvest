<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AiReportType;
use App\Enums\TransactionType;
use App\Models\AiReport;
use App\Models\User;
use Illuminate\Http\Request;

class BuildDashboardPageData
{
    public function __construct(
        private readonly PortfolioSelector $selector,
        private readonly PortfolioMarketDataFetcher $marketData,
        private readonly PortfolioCalculator $calculator,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, Request $request): array
    {
        $portfolios = $this->selector->listFor($user);
        $activeId = (int) $request->query('portfolio', '0');
        $activePortfolio = $this->selector->resolveForDashboard($portfolios, $activeId);

        $payload = null;

        if ($activePortfolio) {
            $activePortfolio->load(['positions.instrument', 'positions.transactions']);

            $market = $this->marketData->fetch(
                collect([$activePortfolio]),
                (bool) $request->boolean('refresh'),
                reportException: true,
            );

            $payload = [
                'portfolio' => [
                    'id' => $activePortfolio->id,
                    'name' => $activePortfolio->name,
                    'is_default' => $activePortfolio->is_default,
                ],
                'kpis' => $this->calculator->computePortfolio(
                    $activePortfolio,
                    $market['quotes'],
                    $market['fxRates'],
                ),
                'last_updated' => now()->toIso8601String(),
                'quote_error' => $market['error'],
            ];
        }

        return [
            'portfolios' => $portfolios,
            'active' => $payload,
            'aiReport' => $activePortfolio
                ? AiReport::query()->todayFor($user, AiReportType::Portfolio, $activePortfolio->id)->first()
                : null,
            'aiGlobalReport' => AiReport::query()->todayFor($user, AiReportType::Global)->first(),
            'transactionTypes' => collect(TransactionType::cases())->map(fn ($type) => [
                'value' => $type->value,
                'label' => $type->label(),
            ])->all(),
        ];
    }
}
