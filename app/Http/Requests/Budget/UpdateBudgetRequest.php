<?php

declare(strict_types=1);

namespace App\Http\Requests\Budget;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $budget = $this->user()?->budget;

        if ($budget === null) {
            return $this->user() !== null;
        }

        return $this->user()->can('update', $budget);
    }

    public function rules(): array
    {
        return [
            'income' => ['required', 'array'],
            'income.lines' => ['present', 'array'],
            'income.lines.*.name' => ['required', 'string', 'max:100'],
            'income.lines.*.amount' => ['required', 'integer', 'min:0', 'max:99999999'],

            'investments' => ['required', 'array'],
            'investments.groups' => ['present', 'array'],
            'investments.groups.*.name' => ['required', 'string', 'max:100'],
            'investments.groups.*.lines' => ['present', 'array'],
            'investments.groups.*.lines.*.name' => ['required', 'string', 'max:100'],
            'investments.groups.*.lines.*.amount' => ['required', 'integer', 'min:0', 'max:99999999'],

            'expenses' => ['required', 'array'],
            'expenses.groups' => ['present', 'array'],
            'expenses.groups.*.name' => ['required', 'string', 'max:100'],
            'expenses.groups.*.lines' => ['present', 'array'],
            'expenses.groups.*.lines.*.name' => ['required', 'string', 'max:100'],
            'expenses.groups.*.lines.*.amount' => ['required', 'integer', 'min:0', 'max:99999999'],
        ];
    }
}
