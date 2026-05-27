<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Budget\SyncBudget;
use App\Enums\BudgetGroupType;
use App\Models\Budget;
use App\Services\PortfolioStatistics;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalculatorController extends Controller
{
    public function show(Request $request, PortfolioStatistics $stats, SyncBudget $sync): Response
    {
        $user = $request->user();

        $payload = $stats->compute($user);
        $initialCapital = (float) ($payload['totals']['invested_eur'] ?? 0.0);

        $monthlySavings = $this->computeMonthlySavings($sync::ensureFor($user));

        return Inertia::render('calculator', [
            'defaults' => [
                'initial_capital_eur' => round($initialCapital, 2),
                'monthly_savings_eur' => round($monthlySavings, 2),
                'has_portfolios' => $initialCapital > 0.0,
                'has_budget' => $monthlySavings > 0.0,
            ],
        ]);
    }

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
