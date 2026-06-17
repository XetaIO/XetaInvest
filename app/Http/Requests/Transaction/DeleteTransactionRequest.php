<?php

declare(strict_types=1);

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

class DeleteTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('transaction')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
