<?php

declare(strict_types=1);

namespace App\Http\Requests\Portfolio;

use Illuminate\Foundation\Http\FormRequest;

class DeletePortfolioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('delete', $this->route('portfolio')) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
