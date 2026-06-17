<?php

declare(strict_types=1);

namespace App\Actions\Budget;

use App\Enums\BudgetGroupType;
use App\Models\Budget;
use Illuminate\Support\Facades\DB;

class SyncBudget
{
    /**
     * Synchronizes the budget with the provided payload. It deletes existing groups and lines, creates a new income group, and synchronizes investment and expense groups based on the payload.
     *
     * @param Budget $budget The budget instance to synchronize.
     * @param array $payload The payload containing the budget data, including income, investments, and expenses.
     *
     * @return Budget|null The updated budget instance with its groups and lines, or null if the operation fails.
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
     * Synchronizes groups of a specific type (Investment or Expense) for the given budget. It creates new groups and their associated lines based on the provided data.
     *
     * @param Budget $budget The budget instance for which to synchronize groups.
     * @param BudgetGroupType $type The type of groups to synchronize (Investment or Expense).
     * @param array $groups The array of group data, each containing a name and an array of lines with their respective names and amounts.
     *
     * @return void
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
