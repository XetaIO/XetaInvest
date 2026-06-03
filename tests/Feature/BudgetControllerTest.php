<?php

declare(strict_types=1);

use App\Enums\BudgetGroupType;
use App\Models\Budget;
use App\Models\BudgetGroup;
use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('guest is redirected to login', function () {
    $this->get(route('budget.show'))->assertRedirect(route('login'));
});

test('visiting budget creates a budget with an income group', function () {
    $this->actingAs($this->user)
        ->get(route('budget.show'))
        ->assertOk();

    expect(Budget::where('user_id', $this->user->id)->exists())->toBeTrue()
        ->and($this->user->budget->groups()->where('type', BudgetGroupType::Income->value)->exists())->toBeTrue();
});

test('show returns the budget structure with three sections', function () {
    $this->actingAs($this->user)
        ->get(route('budget.show'))
        ->assertInertia(
            fn ($page) => $page
            ->component('budget')
            ->has('budget.income.lines')
            ->has('budget.investments.groups')
            ->has('budget.expenses.groups')
        );
});

test('update replaces the budget structure', function () {
    $this->actingAs($this->user)->get(route('budget.show'));

    $payload = [
        'income' => [
            'lines' => [
                ['name' => 'Salaire', 'amount' => 2500],
            ],
        ],
        'investments' => [
            'groups' => [
                [
                    'name' => 'Investissements mensuels',
                    'lines' => [
                        ['name' => 'Actions', 'amount' => 200],
                        ['name' => 'Assurance vie', 'amount' => 200],
                    ],
                ],
            ],
        ],
        'expenses' => [
            'groups' => [
                [
                    'name' => 'Logement',
                    'lines' => [
                        ['name' => 'Loyer', 'amount' => 500],
                        ['name' => 'Charges', 'amount' => 120],
                    ],
                ],
            ],
        ],
    ];

    $this->actingAs($this->user)
        ->put(route('budget.update'), $payload)
        ->assertRedirect();

    $budget = $this->user->budget()->with('groups.lines')->first();

    expect($budget->groups)->toHaveCount(3)
        ->and($budget->groupsOfType(BudgetGroupType::Income)->first()->lines->pluck('name')->all())
        ->toBe(['Salaire'])
        ->and($budget->groupsOfType(BudgetGroupType::Investment)->first()->lines->pluck('amount')->all())
        ->toBe([200, 200])
        ->and($budget->groupsOfType(BudgetGroupType::Expense)->first()->lines->pluck('name')->all())
        ->toBe(['Loyer', 'Charges']);
});

test('update wipes previous data before recreating', function () {
    $this->actingAs($this->user)->get(route('budget.show'));

    $this->actingAs($this->user)->put(route('budget.update'), [
        'income' => ['lines' => [['name' => 'Old', 'amount' => 1000]]],
        'investments' => ['groups' => []],
        'expenses' => ['groups' => []],
    ]);

    $this->actingAs($this->user)->put(route('budget.update'), [
        'income' => ['lines' => [['name' => 'New', 'amount' => 2000]]],
        'investments' => ['groups' => []],
        'expenses' => ['groups' => []],
    ]);

    $lines = $this->user->budget->groupsOfType(BudgetGroupType::Income)->first()->lines;
    expect($lines)->toHaveCount(1)
        ->and($lines->first()->name)->toBe('New')
        ->and($lines->first()->amount)->toBe(2000);
});

test('empty groups are allowed', function () {
    $this->actingAs($this->user)->get(route('budget.show'));

    $this->actingAs($this->user)
        ->put(route('budget.update'), [
            'income' => ['lines' => []],
            'investments' => ['groups' => [['name' => 'Empty cat', 'lines' => []]]],
            'expenses' => ['groups' => []],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($this->user->budget->groupsOfType(BudgetGroupType::Investment)->count())->toBe(1);
});

test('negative amount is rejected', function () {
    $this->actingAs($this->user)
        ->put(route('budget.update'), [
            'income' => ['lines' => [['name' => 'X', 'amount' => -100]]],
            'investments' => ['groups' => []],
            'expenses' => ['groups' => []],
        ])
        ->assertSessionHasErrors('income.lines.0.amount');
});

test('non integer amount is rejected', function () {
    $this->actingAs($this->user)
        ->put(route('budget.update'), [
            'income' => ['lines' => [['name' => 'X', 'amount' => 12.5]]],
            'investments' => ['groups' => []],
            'expenses' => ['groups' => []],
        ])
        ->assertSessionHasErrors('income.lines.0.amount');
});

test('users cannot affect another user budget', function () {
    $other = User::factory()->create();
    $otherBudget = Budget::factory()->forUser($other)->create();
    BudgetGroup::factory()->forBudget($otherBudget)->ofType(BudgetGroupType::Income)->create();

    $this->actingAs($this->user)->put(route('budget.update'), [
        'income' => ['lines' => [['name' => 'Mine', 'amount' => 1]]],
        'investments' => ['groups' => []],
        'expenses' => ['groups' => []],
    ]);

    expect($otherBudget->fresh()->groups()->first()->name)->not->toBe('Mine');
    expect($this->user->fresh()->budget->groupsOfType(BudgetGroupType::Income)->first()->lines->first()->name)->toBe('Mine');
});
