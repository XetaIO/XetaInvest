<?php

declare(strict_types=1);

namespace App\Enums;

enum BudgetGroupType: string
{
    case Income = 'income';
    case Investment = 'investment';
    case Expense = 'expense';

    public function label(): string
    {
        return match ($this) {
            self::Income => 'Revenus',
            self::Investment => 'Investissements',
            self::Expense => 'Dépenses',
        };
    }
}
