<?php

declare(strict_types=1);

namespace App\Actions\Budget;

use App\Enums\BudgetGroupType;
use App\Models\Budget;
use App\Models\User;

class EnsureBudgetExists
{
    /**
     * Ensures that a budget exists for the given user. If no budget exists, it creates a new one and ensures that an income group is present.
     *
     * @param User $user The user for whom to ensure a budget exists.
     *
     * @return Budget The existing or newly created budget instance.
     */
    public function handle(User $user): Budget
    {
        $budget = Budget::firstOrCreate(['user_id' => $user->id]);

        if ($budget->groups()->where('type', BudgetGroupType::Income->value)->doesntExist()) {
            $budget->groups()->create([
                'type' => BudgetGroupType::Income->value,
                'name' => 'Revenus',
                'sort_order' => 0,
            ]);
        }

        return $budget;
    }
}
