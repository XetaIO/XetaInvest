<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\TransactionType;
use App\Exceptions\FinanceQueryException;
use App\Models\AiReport;
use App\Services\FinanceQueryClient;
use App\Services\PortfolioCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function show(
        Request $request,
        FinanceQueryClient $client,
        PortfolioCalculator $calculator,
    ): Response {
        $user = $request->user();
        $portfolios = $user->portfolios()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get(['id', 'name', 'is_default']);

        $activeId = (int) $request->query('portfolio', '0');
        $activePortfolio = $portfolios->firstWhere('id', $activeId)
            ?? $portfolios->firstWhere('is_default', true)
            ?? $portfolios->first();

        $payload = null;
        $error = null;

        if ($activePortfolio) {
            $activePortfolio->load(['positions.instrument', 'positions.transactions']);

            $symbols = $activePortfolio->positions
                ->map(fn ($p) => strtoupper($p->instrument->symbol))
                ->unique()
                ->values()
                ->all();

            $quotes = [];
            $fxRates = ['EUR' => 1.0];
            $lastUpdated = now()->toIso8601String();

            if (! empty($symbols)) {
                try {
                    $force = (bool) $request->boolean('refresh');
                    $quotes = $client->quotes($symbols, $force);

                    $currencies = $activePortfolio->positions
                        ->map(fn ($p) => strtoupper($p->instrument->currency ?? 'USD'))
                        ->unique();

                    foreach ($currencies as $cur) {
                        if (! isset($fxRates[$cur])) {
                            $fxRates[$cur] = $client->fxRate($cur, 'EUR');
                        }
                    }
                } catch (FinanceQueryException $e) {
                    report($e);
                    $error = __('messages.market_data.unavailable');
                }
            }

            $payload = [
                'portfolio' => [
                    'id' => $activePortfolio->id,
                    'name' => $activePortfolio->name,
                    'is_default' => $activePortfolio->is_default,
                ],
                'kpis' => $calculator->computePortfolio($activePortfolio, $quotes, $fxRates),
                'last_updated' => $lastUpdated,
                'quote_error' => $error,
            ];
        }

        return Inertia::render('dashboard', [
            'portfolios' => $portfolios,
            'active' => $payload,
            'aiReport' => $activePortfolio
                ? AiReport::query()
                    ->where('user_id', $user->id)
                    ->where('type', 'portfolio')
                    ->where('scope_id', $activePortfolio->id)
                    ->whereDate('generated_for_date', today())
                    ->latest()
                    ->first()
                : null,
            'aiGlobalReport' => AiReport::query()
                ->where('user_id', $user->id)
                ->where('type', 'global')
                ->whereDate('generated_for_date', today())
                ->latest()
                ->first(),
            'transactionTypes' => collect(TransactionType::cases())->map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ])->all(),
        ]);
    }
}
