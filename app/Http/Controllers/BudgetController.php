<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Budget\EnsureBudgetExists;
use App\Actions\Budget\SyncBudget;
use App\Enums\BudgetGroupType;
use App\Http\Requests\Budget\UpdateBudgetRequest;
use App\Models\Budget;
use App\Models\BudgetGroup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function show(Request $request, EnsureBudgetExists $ensure): Response
    {
        $budget = $ensure->handle($request->user());
        $budget->load(['groups' => fn ($q) => $q->orderBy('sort_order'), 'groups.lines' => fn ($q) => $q->orderBy('sort_order')]);

        return Inertia::render('budget', [
            'budget' => $this->transform($budget),
        ]);
    }

    public function update(UpdateBudgetRequest $request, SyncBudget $action): RedirectResponse
    {
        $budget = Budget::firstOrCreate(['user_id' => $request->user()->id]);

        $action->handle($budget, $request->validated());

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Budget $budget): array
    {
        $incomeGroup = $budget->groups->firstWhere('type', BudgetGroupType::Income);

        return [
            'id' => $budget->id,
            'currency' => $budget->currency,
            'income' => [
                'lines' => $incomeGroup
                    ? $incomeGroup->lines->map(fn ($line) => [
                        'name' => $line->name,
                        'amount' => $line->amount,
                    ])->values()->all()
                    : [],
            ],
            'investments' => [
                'groups' => $this->mapGroups($budget->groups->where('type', BudgetGroupType::Investment)->values()->all()),
            ],
            'expenses' => [
                'groups' => $this->mapGroups($budget->groups->where('type', BudgetGroupType::Expense)->values()->all()),
            ],
        ];
    }

    /**
     * @param  array<int, BudgetGroup>  $groups
     * @return array<int, array<string, mixed>>
     */
    private function mapGroups(array $groups): array
    {
        return array_map(fn (BudgetGroup $group) => [
            'name' => $group->name,
            'lines' => $group->lines->map(fn ($line) => [
                'name' => $line->name,
                'amount' => $line->amount,
            ])->values()->all(),
        ], $groups);
    }
}
