<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Budget\EnsureBudgetExists;
use App\Enums\BudgetGroupType;
use App\Models\Budget;
use App\Services\PortfolioStatistics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalculatorController extends Controller
{
    /**
     * Display the calculator page with default values based on the user's portfolio and budget.
     *
     * @param Request $request The incoming HTTP request.
     * @param PortfolioStatistics $stats Service to compute portfolio statistics.
     * @param EnsureBudgetExists $ensure Action to ensure the user has a budget.
     *
     * @return Response An Inertia response rendering the calculator page with default values.
     */
    public function show(Request $request, PortfolioStatistics $stats, EnsureBudgetExists $ensure): Response
    {
        $user = $request->user();

        $payload = $stats->compute($user);
        $initialCapital = (float) ($payload['totals']['invested_eur'] ?? 0.0);

        $monthlySavings = $this->computeMonthlySavings($ensure->handle($user));

        return Inertia::render('calculator', [
            'defaults' => [
                'initial_capital_eur' => round($initialCapital, 2),
                'monthly_savings_eur' => round($monthlySavings, 2),
                'has_portfolios' => $initialCapital > 0.0,
                'has_budget' => $monthlySavings > 0.0,
            ],
        ]);
    }

    /**
     * Compute the monthly savings based on the user's budget.
     *
     * @param Budget $budget The user's budget.
     *
     * @return float The computed monthly savings.
     */
    private function computeMonthlySavings(Budget $budget): float
    {
        $budget->load(['groups.lines']);

        $sumLines = function ($group): float {
            return (float) $group->lines->sum('amount');
        };

        $income = (float) $budget->groups
            ->where('type', BudgetGroupType::Income)
            ->sum($sumLines);

        $investments = (float) $budget->groups
            ->where('type', BudgetGroupType::Investment)
            ->sum($sumLines);

        $expenses = (float) $budget->groups
            ->where('type', BudgetGroupType::Expense)
            ->sum($sumLines);

        $remaining = $income - $expenses - $investments;

        return $investments + max($remaining, 0.0);
    }
}
