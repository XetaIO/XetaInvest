<?php

namespace Database\Factories;

use App\Enums\BudgetGroupType;
use App\Models\Budget;
use App\Models\BudgetGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetGroup>
 */
class BudgetGroupFactory extends Factory
{
    public function definition(): array
    {
        return [
            'budget_id' => Budget::factory(),
            'type' => BudgetGroupType::Expense,
            'name' => fake()->words(2, true),
            'sort_order' => 0,
        ];
    }

    public function ofType(BudgetGroupType $type): static
    {
        return $this->state(fn () => ['type' => $type]);
    }

    public function forBudget(Budget $budget): static
    {
        return $this->state(fn () => ['budget_id' => $budget->id]);
    }
}
