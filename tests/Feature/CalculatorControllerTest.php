<?php

declare(strict_types=1);

use App\Models\User;

beforeEach(function (): void {
    $this->user = User::factory()->create();
});

test('guest is redirected to login', function () {
    $this->get(route('calculator.show'))->assertRedirect(route('login'));
});

test('authenticated user sees the calculator page', function () {
    $this->actingAs($this->user)
        ->get(route('calculator.show'))
        ->assertOk()
        ->assertInertia(
            fn ($page) => $page
                ->component('calculator')
                ->has('defaults.initial_capital_eur')
                ->has('defaults.monthly_savings_eur')
                ->has('defaults.has_portfolios')
                ->has('defaults.has_budget')
        );
});

test('defaults are zero when user has no portfolios and no budget data', function () {
    $this->actingAs($this->user)
        ->get(route('calculator.show'))
        ->assertInertia(
            fn ($page) => $page
                ->where('defaults.initial_capital_eur', 0)
                ->where('defaults.monthly_savings_eur', 0)
                ->where('defaults.has_portfolios', false)
                ->where('defaults.has_budget', false)
        );
});

test('default monthly savings reflects budget remaining plus investments', function () {
    $this->actingAs($this->user)->get(route('budget.show'));

    $this->actingAs($this->user)->put(route('budget.update'), [
        'income' => [
            'lines' => [
                ['name' => 'Salaire', 'amount' => 3000],
            ],
        ],
        'investments' => [
            'groups' => [
                [
                    'name' => 'Mensuel',
                    'lines' => [
                        ['name' => 'PEA', 'amount' => 400],
                    ],
                ],
            ],
        ],
        'expenses' => [
            'groups' => [
                [
                    'name' => 'Logement',
                    'lines' => [
                        ['name' => 'Loyer', 'amount' => 1000],
                    ],
                ],
            ],
        ],
    ]);

    // income 3000 - expenses 1000 - investments 400 = remaining 1600
    // monthly_savings = investments 400 + max(remaining, 0) 1600 = 2000
    $this->actingAs($this->user)
        ->get(route('calculator.show'))
        ->assertInertia(
            fn ($page) => $page
                ->where('defaults.monthly_savings_eur', 2000)
                ->where('defaults.has_budget', true)
        );
});
