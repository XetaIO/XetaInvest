<?php

declare(strict_types=1);

namespace App\Actions\Budget;

use App\Enums\BudgetGroupType;
use App\Models\Budget;
use Illuminate\Support\Facades\DB;

class SyncBudget
{
    /**
     * @param  array{
     *     income: array{lines: array<int, array{name: string, amount: int}>},
     *     investments: array{groups: array<int, array{name: string, lines: array<int, array{name: string, amount: int}>}>},
     *     expenses: array{groups: array<int, array{name: string, lines: array<int, array{name: string, amount: int}>}>}
     * }  $payload
     */
    public function handle(Budget $budget, array $payload): Budget
    {
        DB::transaction(function () use ($budget, $payload): void {
            $budget->groups()->delete();

            $incomeGroup = $budget->groups()->create([
                'type' => BudgetGroupType::Income->value,
                'name' => 'Revenus',
                'sort_order' => 0,
            ]);

            foreach (($payload['income']['lines'] ?? []) as $index => $line) {
                $incomeGroup->lines()->create([
                    'name' => $line['name'],
                    'amount' => $line['amount'],
                    'sort_order' => $index,
                ]);
            }

            $this->syncTypedGroups($budget, BudgetGroupType::Investment, $payload['investments']['groups'] ?? []);
            $this->syncTypedGroups($budget, BudgetGroupType::Expense, $payload['expenses']['groups'] ?? []);
        });

        return $budget->fresh(['groups.lines']);
    }

    /**
     * @param  array<int, array{name: string, lines: array<int, array{name: string, amount: int}>}>  $groups
     */
    private function syncTypedGroups(Budget $budget, BudgetGroupType $type, array $groups): void
    {
        foreach ($groups as $groupIndex => $groupData) {
            $group = $budget->groups()->create([
                'type' => $type->value,
                'name' => $groupData['name'],
                'sort_order' => $groupIndex,
            ]);

            foreach (($groupData['lines'] ?? []) as $lineIndex => $line) {
                $group->lines()->create([
                    'name' => $line['name'],
                    'amount' => $line['amount'],
                    'sort_order' => $lineIndex,
                ]);
            }
        }
    }
}
