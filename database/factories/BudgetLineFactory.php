<?php

namespace Database\Factories;

use App\Models\BudgetGroup;
use App\Models\BudgetLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetLine>
 */
class BudgetLineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'budget_group_id' => BudgetGroup::factory(),
            'name' => fake()->words(2, true),
            'amount' => fake()->numberBetween(10, 1000),
            'sort_order' => 0,
        ];
    }

    public function forGroup(BudgetGroup $group): static
    {
        return $this->state(fn () => ['budget_group_id' => $group->id]);
    }
}
